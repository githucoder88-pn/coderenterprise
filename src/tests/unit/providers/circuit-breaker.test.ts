/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../../../modules/providers/resilience/circuit-breaker.js';
import type { CircuitBreakerConfig } from '../../../modules/providers/types.js';

const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeoutMs: 1000,
  halfOpenMaxCalls: 2,
  monitoringWindowMs: 10_000,
};

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('openai', defaultConfig);
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe('closed');
    });

    it('should allow execution when closed', () => {
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('failure tracking', () => {
    it('should track failures and stay closed under threshold', () => {
      breaker.recordFailure('error 1');
      breaker.recordFailure('error 2');

      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });

    it('should trip open after reaching failure threshold', () => {
      breaker.recordFailure('error 1');
      breaker.recordFailure('error 2');
      breaker.recordFailure('error 3');

      expect(breaker.getState()).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe('recovery', () => {
    it('should transition to half-open after recovery timeout', async () => {
      breaker.recordFailure('error 1');
      breaker.recordFailure('error 2');
      breaker.recordFailure('error 3');
      expect(breaker.getState()).toBe('open');

      // Wait for recovery timeout
      await new Promise((r) => setTimeout(r, 1100));
      expect(breaker.getState()).toBe('half-open');
      expect(breaker.canExecute()).toBe(true);
    });

    it('should close after enough successes in half-open', async () => {
      // Trip the breaker
      for (let i = 0; i < 3; i++) breaker.recordFailure('error');
      await new Promise((r) => setTimeout(r, 1100));

      // Should be half-open
      expect(breaker.getState()).toBe('half-open');

      // Record enough successes
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe('closed');
    });

    it('should re-trip on failure in half-open', async () => {
      for (let i = 0; i < 3; i++) breaker.recordFailure('error');
      await new Promise((r) => setTimeout(r, 1100));

      expect(breaker.getState()).toBe('half-open');
      breaker.recordFailure('new error');
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('force controls', () => {
    it('should force open', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });

    it('should force close', () => {
      for (let i = 0; i < 5; i++) breaker.recordFailure('error');
      expect(breaker.getState()).toBe('open');

      breaker.forceClose();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('stats', () => {
    it('should return accurate stats', () => {
      breaker.recordFailure('error 1');
      breaker.recordSuccess();

      const stats = breaker.getStats();
      expect(stats.provider).toBe('openai');
      expect(stats.state).toBe('closed');
      expect(stats.failures).toBe(1);
    });
  });
});
