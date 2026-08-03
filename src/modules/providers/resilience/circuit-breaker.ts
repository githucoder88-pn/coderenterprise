/**
 * Circuit Breaker
 *
 * Prevents cascading failures by tripping when a provider fails too often.
 *
 * States:
 *   closed  → normal operation, failures tracked
 *   open    → all requests rejected, timer running
 *   half-open → limited requests allowed to test recovery
 */

import type { CircuitState, CircuitBreakerConfig, ProviderName } from '../types.js';

interface FailureRecord {
  readonly timestamp: number;
  readonly error: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private halfOpenCalls = 0;
  private readonly failures: FailureRecord[] = [];

  constructor(
    private readonly provider: ProviderName,
    private readonly config: CircuitBreakerConfig,
  ) {}

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() >= this.nextAttemptTime) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
    }
    return this.state;
  }

  canExecute(): boolean {
    const state = this.getState();

    switch (state) {
      case 'closed':
        return true;
      case 'open':
        return false;
      case 'half-open':
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.reset();
      }
    } else {
      this.successCount++;
      // Clean old failures outside monitoring window
      this.cleanOldFailures();
    }
  }

  recordFailure(error: string): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.failures.push({ timestamp: now, error });

    this.cleanOldFailures();

    if (this.state === 'half-open') {
      this.trip();
    } else if (this.getRecentFailureCount() >= this.config.failureThreshold) {
      this.trip();
    }
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
    lastFailure: number;
    provider: ProviderName;
  } {
    return {
      state: this.getState(),
      failures: this.getRecentFailureCount(),
      successes: this.successCount,
      nextAttempt: this.nextAttemptTime,
      lastFailure: this.lastFailureTime,
      provider: this.provider,
    };
  }

  forceOpen(): void {
    this.trip();
  }

  forceClose(): void {
    this.reset();
  }

  private trip(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeoutMs;
    this.successCount = 0;
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.failures.length = 0;
    this.halfOpenCalls = 0;
    this.nextAttemptTime = 0;
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.monitoringWindowMs;
    while (this.failures.length > 0 && this.failures[0]!.timestamp < cutoff) {
      this.failures.shift();
    }
  }

  private getRecentFailureCount(): number {
    this.cleanOldFailures();
    return this.failures.length;
  }
}

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  getOrCreate(
    provider: ProviderName,
    config: CircuitBreakerConfig,
  ): CircuitBreaker {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, new CircuitBreaker(provider, config));
    }
    return this.breakers.get(provider)!;
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
    }
  }
}
