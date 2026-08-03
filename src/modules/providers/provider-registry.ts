/**
 * Provider Registry
 *
 * Central registry for all AI providers. Providers are registered once
 * and resolved by name. Supports health-based filtering and capability queries.
 */

import type {
  Provider,
  ProviderName,
  ProviderCapabilities,
} from './types.js';
import type { CircuitBreakerConfig } from './types.js';
import { CircuitBreaker } from './resilience/circuit-breaker.js';
import { RequestQueue } from './resilience/request-queue.js';
import type { QueueConfig } from './types.js';

const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60_000,
  halfOpenMaxCalls: 2,
  monitoringWindowMs: 120_000,
};

const DEFAULT_QUEUE: QueueConfig = {
  maxSize: 1000,
  concurrency: 10,
  timeoutMs: 60_000,
};

interface RegisteredProvider {
  readonly provider: Provider;
  readonly circuitBreaker: CircuitBreaker;
  readonly requestQueue: RequestQueue;
  enabled: boolean;
  weight: number;
  priority: number;
}

export class ProviderRegistry {
  private readonly providers = new Map<ProviderName, RegisteredProvider>();

  /**
   * Register a provider with optional circuit breaker and queue config.
   */
  register(
    provider: Provider,
    options?: {
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      queue?: Partial<QueueConfig>;
      weight?: number;
      priority?: number;
    },
  ): this {
    const cbConfig = { ...DEFAULT_CIRCUIT_BREAKER, ...options?.circuitBreaker };
    const queueConfig = { ...DEFAULT_QUEUE, ...options?.queue };

    this.providers.set(provider.name, {
      provider,
      circuitBreaker: new CircuitBreaker(provider.name, cbConfig),
      requestQueue: new RequestQueue(provider.name, queueConfig),
      enabled: true,
      weight: options?.weight ?? 1,
      priority: options?.priority ?? 0,
    });

    return this;
  }

  /**
   * Get a registered provider by name.
   */
  get(name: ProviderName): Provider | null {
    return this.providers.get(name)?.provider ?? null;
  }

  /**
   * Get all registered providers.
   */
  getAll(): readonly Provider[] {
    return [...this.providers.values()].map((r) => r.provider);
  }

  /**
   * Get only healthy, enabled providers.
   */
  getHealthy(): readonly Provider[] {
    return [...this.providers.values()]
      .filter((r) => r.enabled && r.circuitBreaker.canExecute())
      .map((r) => r.provider);
  }

  /**
   * Get providers that support a specific capability.
   */
  getByCapability(capability: keyof ProviderCapabilities): readonly Provider[] {
    return this.getHealthy().filter((p) => p.capabilities[capability]);
  }

  /**
   * Get providers that support a specific model.
   */
  getByModel(model: string): readonly Provider[] {
    return this.getHealthy().filter(
      (p) => p.capabilities.supportedModels.includes(model) || model.startsWith(p.name + '/'),
    );
  }

  /**
   * Enable or disable a provider.
   */
  setEnabled(name: ProviderName, enabled: boolean): void {
    const reg = this.providers.get(name);
    if (reg) reg.enabled = enabled;
  }

  /**
   * Get the circuit breaker for a provider.
   */
  getCircuitBreaker(name: ProviderName): CircuitBreaker | null {
    return this.providers.get(name)?.circuitBreaker ?? null;
  }

  /**
   * Get the request queue for a provider.
   */
  getRequestQueue(name: ProviderName): RequestQueue | null {
    return this.providers.get(name)?.requestQueue ?? null;
  }

  /**
   * Get the weight for a provider (for load balancing).
   */
  getWeight(name: ProviderName): number {
    return this.providers.get(name)?.weight ?? 1;
  }

  /**
   * Set the weight for a provider.
   */
  setWeight(name: ProviderName, weight: number): void {
    const reg = this.providers.get(name);
    if (reg) reg.weight = weight;
  }

  /**
   * Get the priority for a provider.
   */
  getPriority(name: ProviderName): number {
    return this.providers.get(name)?.priority ?? 0;
  }

  /**
   * Get health and stats for all registered providers.
   */
  getStats(): readonly {
    name: ProviderName;
    enabled: boolean;
    circuitState: string;
    circuitFailures: number;
    queueRunning: number;
    queueQueued: number;
    weight: number;
    priority: number;
  }[] {
    return [...this.providers.entries()].map(([name, reg]) => ({
      name,
      enabled: reg.enabled,
      circuitState: reg.circuitBreaker.getState(),
      circuitFailures: reg.circuitBreaker.getStats().failures,
      queueRunning: reg.requestQueue.getStats().running,
      queueQueued: reg.requestQueue.getStats().queued,
      weight: reg.weight,
      priority: reg.priority,
    }));
  }

  /**
   * Check if a provider is registered.
   */
  has(name: ProviderName): boolean {
    return this.providers.has(name);
  }
}
