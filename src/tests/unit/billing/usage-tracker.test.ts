/**
 * Usage Tracker Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsageTracker } from '../../../analytics/usage-tracker.js';
import { createMockLogger } from '../../helpers.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  const counters = new Map<string, number>();
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0),
    getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async (key: string) => {
      const val = (counters.get(key) ?? 0) + 1;
      counters.set(key, val);
      return val;
    }),
    has: vi.fn(async () => false),
    ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker(createMockCache(), createMockLogger());
  });

  describe('track', () => {
    it('should track usage record', async () => {
      const result = await tracker.track({
        organizationId: 'org-1', userId: 'user-1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 1200, status: 'success', metadata: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalTokens).toBe(1500);
        expect(result.data.estimatedCost).toBeGreaterThan(0);
        expect(result.data.currency).toBe('USD');
      }
    });

    it('should calculate cost with cached tokens', async () => {
      const result = await tracker.track({
        organizationId: 'org-1', userId: 'user-1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 500, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 800, status: 'success', metadata: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimatedCost).toBeGreaterThan(0);
      }
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for known models', () => {
      const estimate = tracker.estimateCost('gpt-4o', 'openai', 10000, 5000);
      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.breakdown.inputCost).toBeGreaterThan(0);
      expect(estimate.breakdown.outputCost).toBeGreaterThan(0);
    });

    it('should apply cached token discount', () => {
      const withoutCache = tracker.estimateCost('gpt-4o', 'openai', 10000, 5000, 0);
      const withCache = tracker.estimateCost('gpt-4o', 'openai', 10000, 5000, 5000);
      expect(withCache.estimatedCost).toBeLessThan(withoutCache.estimatedCost);
      expect(withCache.breakdown.cachedDiscount).toBeGreaterThan(0);
    });

    it('should handle unknown models with default pricing', () => {
      const estimate = tracker.estimateCost('unknown-model', 'openai', 1000, 500);
      expect(estimate.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('getUsage', () => {
    it('should aggregate usage by period', async () => {
      await tracker.track({
        organizationId: 'org-1', userId: 'user-1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });

      const today = new Date().toISOString().slice(0, 10);
      const usage = await tracker.getUsage('org-1', today);
      expect(usage.totalRequests).toBe(1);
      expect(usage.totalTokens).toBe(1500);
    });

    it('should aggregate by model', async () => {
      await tracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });
      await tracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'claude-3', provider: 'anthropic',
        promptTokens: 800, completionTokens: 400, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 200, status: 'success', metadata: {},
      });

      const month = new Date().toISOString().slice(0, 7);
      const usage = await tracker.getUsage('org-1', month);
      expect(Object.keys(usage.byModel).length).toBe(2);
    });
  });

  describe('getModelStats', () => {
    it('should return model statistics', async () => {
      await tracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });

      const month = new Date().toISOString().slice(0, 7);
      const stats = await tracker.getModelStats('org-1', month);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]!.totalRequests).toBe(1);
    });
  });

  describe('getPricingTable', () => {
    it('should return default pricing', () => {
      const table = tracker.getPricingTable();
      expect(table.length).toBeGreaterThan(0);
      expect(table.some((p) => p.provider === 'openai')).toBe(true);
    });
  });

  describe('updatePricing', () => {
    it('should update model pricing', () => {
      tracker.updatePricing('gpt-4o', 'openai', 5, 15);
      const estimate = tracker.estimateCost('gpt-4o', 'openai', 1000000, 1000000);
      expect(estimate.breakdown.inputCost).toBeCloseTo(5, 1);
      expect(estimate.breakdown.outputCost).toBeCloseTo(15, 1);
    });
  });
});
