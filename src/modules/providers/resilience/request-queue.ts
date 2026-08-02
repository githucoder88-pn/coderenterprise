/**
 * Request Queue
 *
 * Concurrency-controlled request queue with timeout and priority support.
 * Prevents overwhelming providers with too many concurrent requests.
 */

import type { QueueConfig, ProviderName } from '../types.js';

interface QueuedRequest<T> {
  readonly id: string;
  readonly priority: number;
  readonly enqueuedAt: number;
  readonly fn: () => Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
}

export class RequestQueue {
  private readonly queue: QueuedRequest<any>[] = [];
  private running = 0;
  private totalProcessed = 0;
  private totalTimedOut = 0;

  constructor(
    private readonly provider: ProviderName,
    private readonly config: QueueConfig,
  ) {}

  /**
   * Enqueue a request. Returns a promise that resolves when the request completes.
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    priority = 0,
    timeoutMs?: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.queue.length >= this.config.maxSize) {
        reject(new QueueOverflowError(this.provider, this.config.maxSize));
        return;
      }

      const id = crypto.randomUUID();
      const timeout = timeoutMs ?? this.config.timeoutMs;

      const wrappedResolve = (value: T) => {
        this.running--;
        this.totalProcessed++;
        this.processNext();
        resolve(value);
      };

      const wrappedReject = (error: Error) => {
        this.running--;
        this.totalProcessed++;
        if (error.message.includes('timeout')) this.totalTimedOut++;
        this.processNext();
        reject(error);
      };

      // Set timeout
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((r) => r.id === id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.totalTimedOut++;
          wrappedReject(
            new QueueTimeoutError(this.provider, timeout),
          );
        }
      }, timeout);

      const wrappedFn = async (): Promise<T> => {
        clearTimeout(timer);
        return fn();
      };

      const request: QueuedRequest<T> = {
        id,
        priority,
        enqueuedAt: Date.now(),
        fn: wrappedFn,
        resolve: wrappedResolve as any,
        reject: wrappedReject,
      };

      // Insert sorted by priority (higher = first)
      const insertIdx = this.queue.findIndex((r) => r.priority < priority);
      if (insertIdx === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIdx, 0, request);
      }

      this.processNext();
    });
  }

  getStats(): {
    queued: number;
    running: number;
    totalProcessed: number;
    totalTimedOut: number;
    provider: ProviderName;
  } {
    return {
      queued: this.queue.length,
      running: this.running,
      totalProcessed: this.totalProcessed,
      totalTimedOut: this.totalTimedOut,
      provider: this.provider,
    };
  }

  private processNext(): void {
    while (this.running < this.config.concurrency && this.queue.length > 0) {
      const request = this.queue.shift()!;
      this.running++;
      request.fn().then(request.resolve).catch(request.reject);
    }
  }
}

export class QueueOverflowError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly maxSize: number,
  ) {
    super(`[${provider}] Queue overflow: max size ${maxSize} reached`);
    this.name = 'QueueOverflowError';
  }
}

export class QueueTimeoutError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly timeoutMs: number,
  ) {
    super(`[${provider}] Queue timeout after ${timeoutMs}ms`);
    this.name = 'QueueTimeoutError';
  }
}
