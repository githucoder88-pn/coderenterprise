/**
 * Provider Router
 *
 * Orchestrates provider selection with fallback, load balancing,
 * circuit breaker integration, and request queuing.
 *
 * Callers use this — never providers directly.
 */

import type {
  Provider,
  ProviderName,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageRequest,
  ImageResponse,
  Message,
  FallbackConfig,
  LoadBalancerConfig,
} from './types.js';
import { ProviderRegistry } from './provider-registry.js';
import { LoadBalancer } from './resilience/load-balancer.js';
import { ProviderError, ProviderRateLimitError } from './base-provider.js';
import { nanoid } from 'nanoid';

interface RouterConfig {
  readonly fallback: FallbackConfig;
  readonly loadBalancer: LoadBalancerConfig;
  readonly defaultProvider: ProviderName;
}

interface RouterStats {
  readonly totalRequests: number;
  readonly totalSuccesses: number;
  readonly totalFailures: number;
  readonly totalFallbacks: number;
  readonly providerBreakdown: Record<ProviderName, { requests: number; successes: number; failures: number }>;
}

export class ProviderRouter {
  private readonly loadBalancer: LoadBalancer;
  private stats: RouterStats = {
    totalRequests: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalFallbacks: 0,
    providerBreakdown: {} as any,
  };

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly config: RouterConfig,
  ) {
    this.loadBalancer = new LoadBalancer(config.loadBalancer);
  }

  /**
   * Route a completion request to the best available provider.
   * Implements fallback on failure.
   */
  async complete(request: ProviderRequest, preferredProvider?: ProviderName): Promise<ProviderResponse> {
    const providers = this.getProviderChain(preferredProvider, request.model);
    return this.executeWithFallback(providers, (p) => {
      this.recordRequest(p.name);
      return this.enqueueOrDirect(p, () => p.complete(request));
    });
  }

  /**
   * Route a streaming request.
   */
  async stream(request: ProviderRequest, preferredProvider?: ProviderName): Promise<ProviderStream> {
    const providers = this.getProviderChain(preferredProvider, request.model);

    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        this.recordRequest(provider.name);
        const stream = await provider.stream(request);
        this.recordSuccess(provider.name);
        return stream;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(provider.name);

        const cb = this.registry.getCircuitBreaker(provider.name);
        cb?.recordFailure(lastError.message);

        if (!this.config.fallback.enabled) throw lastError;
      }
    }

    throw lastError ?? new ProviderError(this.config.defaultProvider, 'NO_PROVIDERS', 'No providers available');
  }

  /**
   * Route an embedding request.
   */
  async embed(request: EmbeddingRequest, preferredProvider?: ProviderName): Promise<EmbeddingResponse> {
    const providers = this.getProviderChain(preferredProvider, request.model)
      .filter((p) => p.capabilities.embeddings && p.embed);

    return this.executeWithFallback(providers, (p) => {
      this.recordRequest(p.name);
      return this.enqueueOrDirect(p, () => p.embed!(request));
    });
  }

  /**
   * Route an image generation request.
   */
  async generateImage(request: ImageRequest, preferredProvider?: ProviderName): Promise<ImageResponse> {
    const providers = this.getProviderChain(preferredProvider, request.model)
      .filter((p) => p.capabilities.imageGeneration && p.generateImage);

    return this.executeWithFallback(providers, (p) => {
      this.recordRequest(p.name);
      return this.enqueueOrDirect(p, () => p.generateImage!(request));
    });
  }

  /**
   * Count tokens for the given messages using the specified provider.
   */
  async countTokens(
    model: string,
    messages: readonly Message[],
    providerName?: ProviderName,
  ): Promise<number> {
    const provider = providerName
      ? this.registry.get(providerName)
      : this.registry.get(this.config.defaultProvider);

    if (!provider) throw new ProviderError(this.config.defaultProvider, 'NOT_FOUND', 'Provider not found');

    return provider.countTokens(model, messages);
  }

  /**
   * Get aggregate stats.
   */
  getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Reset stats.
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalFallbacks: 0,
      providerBreakdown: {} as any,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private getProviderChain(preferred?: ProviderName, model?: string): Provider[] {
    const fallbackOrder = this.config.fallback.providerOrder;
    const healthy = this.registry.getHealthy();

    // Start with preferred or load-balanced selection
    let primary: Provider | null = null;
    if (preferred) {
      primary = this.registry.get(preferred);
    } else if (model) {
      const modelProviders = healthy.filter(
        (p) => p.capabilities.supportedModels.some((m) => model.includes(m)) || model.startsWith(p.name + '/'),
      );
      primary = modelProviders.length > 0
        ? this.loadBalancer.select(modelProviders)
        : this.loadBalancer.select(healthy);
    } else {
      primary = this.loadBalancer.select(healthy);
    }

    const chain: Provider[] = [];
    if (primary) chain.push(primary);

    // Add fallback providers in order
    for (const name of fallbackOrder) {
      const p = this.registry.get(name);
      if (p && p !== primary && healthy.includes(p)) {
        chain.push(p);
      }
    }

    // Add any remaining healthy providers not in fallback order
    for (const p of healthy) {
      if (!chain.includes(p)) {
        chain.push(p);
      }
    }

    return chain.slice(0, this.config.fallback.maxAttempts);
  }

  private async executeWithFallback<T>(
    providers: Provider[],
    fn: (provider: Provider) => Promise<T>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]!;
      try {
        const result = await fn(provider);
        this.recordSuccess(provider.name);

        const cb = this.registry.getCircuitBreaker(provider.name);
        cb?.recordSuccess();

        if (i > 0) {
          this.stats.totalFallbacks++;
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordFailure(provider.name);

        const cb = this.registry.getCircuitBreaker(provider.name);
        cb?.recordFailure(lastError.message);

        // Don't fallback on auth errors
        if (lastError instanceof ProviderRateLimitError || !this.config.fallback.enabled) {
          // For rate limits, try the next provider
          if (!(lastError instanceof ProviderRateLimitError)) {
            throw lastError;
          }
        }
      }
    }

    throw lastError ?? new ProviderError(this.config.defaultProvider, 'ALL_FAILED', 'All providers failed');
  }

  private async enqueueOrDirect<T>(provider: Provider, fn: () => Promise<T>): Promise<T> {
    const queue = this.registry.getRequestQueue(provider.name);
    if (queue) {
      return queue.enqueue(fn);
    }
    return fn();
  }

  private recordRequest(provider: ProviderName): void {
    this.stats.totalRequests++;
    if (!this.stats.providerBreakdown[provider]) {
      this.stats.providerBreakdown[provider] = { requests: 0, successes: 0, failures: 0 };
    }
    this.stats.providerBreakdown[provider]!.requests++;
  }

  private recordSuccess(provider: ProviderName): void {
    this.stats.totalSuccesses++;
    if (this.stats.providerBreakdown[provider]) {
      this.stats.providerBreakdown[provider]!.successes++;
    }
  }

  private recordFailure(provider: ProviderName): void {
    this.stats.totalFailures++;
    if (this.stats.providerBreakdown[provider]) {
      this.stats.providerBreakdown[provider]!.failures++;
    }
  }
}
