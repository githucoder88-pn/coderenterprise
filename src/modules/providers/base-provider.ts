/**
 * Base Provider
 *
 * Abstract base class all providers extend.
 * Handles common concerns: retries, timeouts, error normalization, token estimation.
 */

import { nanoid } from 'nanoid';
import type {
  Provider,
  ProviderName,
  ProviderConfig,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  ProviderMetadata,
  TokenUsage,
  Message,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageRequest,
  ImageResponse,
} from './types.js';

export abstract class BaseProvider implements Provider {
  abstract readonly name: ProviderName;
  abstract readonly capabilities: ProviderCapabilities;

  constructor(public readonly config: ProviderConfig) {}

  // ─── Abstract Methods ────────────────────────────────────────────────────

  protected abstract doComplete(request: ProviderRequest): Promise<ProviderResponse>;
  protected abstract doStream(request: ProviderRequest): Promise<ProviderStream>;

  // ─── Public API (with retry) ─────────────────────────────────────────────

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    return this.withRetry(async () => {
      const start = performance.now();
      const response = await this.doComplete(request);
      return {
        ...response,
        metadata: {
          ...response.metadata,
          latencyMs: performance.now() - start,
        },
      };
    });
  }

  async stream(request: ProviderRequest): Promise<ProviderStream> {
    return this.doStream(request);
  }

  async embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  async generateImage?(request: ImageRequest): Promise<ImageResponse>;

  async countTokens(_model: string, messages: readonly Message[]): Promise<number> {
    // Default: rough character-based estimate (4 chars ≈ 1 token)
    // Providers override with tokenizer-specific logic
    let totalChars = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else {
        for (const part of msg.content) {
          if (part.text) totalChars += part.text.length;
        }
      }
      totalChars += 4; // role overhead
    }
    return Math.ceil(totalChars / 4);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete({
        model: this.config.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  protected createMetadata(
    request: ProviderRequest,
    attempt = 1,
    cached = false,
  ): ProviderMetadata {
    return {
      requestId: nanoid(),
      provider: this.name,
      model: request.model,
      latencyMs: 0,
      attempt,
      cached,
      timestamp: new Date(),
    };
  }

  protected createUsageId(): string {
    return `chatcmpl-${nanoid(24)}`;
  }

  protected async withRetry<T extends ProviderResponse>(
    fn: () => Promise<T>,
  ): Promise<T> {
    const maxRetries = this.config.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryable(lastError) || attempt === maxRetries) {
          throw this.normalizeError(lastError);
        }

        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    throw this.normalizeError(lastError ?? new Error('Max retries exceeded'));
  }

  protected isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused')
    );
  }

  protected calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const base = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
    const jitter = Math.random() * base * 0.3;
    return base + jitter;
  }

  protected normalizeError(error: Error): Error {
    const msg = error.message;
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      return new ProviderRateLimitError(this.name, msg);
    }
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return new ProviderAuthError(this.name, msg);
    }
    if (msg.includes('503') || msg.toLowerCase().includes('overloaded')) {
      return new ProviderOverloadedError(this.name, msg);
    }
    if (msg.includes('timeout')) {
      return new ProviderTimeoutError(this.name, msg);
    }
    return new ProviderError(this.name, 'PROVIDER_ERROR', msg);
  }

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
  }

  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs?: number,
  ): Promise<Response> {
    const timeout = timeoutMs ?? this.config.timeout;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ─── Provider Errors ─────────────────────────────────────────────────────────

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: Error,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: ProviderName, message: string) {
    super(provider, 'RATE_LIMIT', message, 429);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: ProviderName, message: string) {
    super(provider, 'AUTH_ERROR', message, 401);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderOverloadedError extends ProviderError {
  constructor(provider: ProviderName, message: string) {
    super(provider, 'OVERLOADED', message, 503);
    this.name = 'ProviderOverloadedError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: ProviderName, message: string) {
    super(provider, 'TIMEOUT', message, 408);
    this.name = 'ProviderTimeoutError';
  }
}
