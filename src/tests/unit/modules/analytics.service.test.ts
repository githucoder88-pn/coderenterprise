/**
 * Analytics Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../../../modules/analytics/analytics.service.js';
import { createMockLogger, createMockEventBus } from '../../helpers.js';
import { MetricsCollector } from '../../../telemetry/metrics.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) as any ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
    delPattern: vi.fn(async () => 0),
    getOrSet: vi.fn(async (key: string, factory: () => Promise<any>) => {
      const cached = store.get(key);
      if (cached) return cached;
      const value = await factory();
      store.set(key, value);
      return value;
    }),
    increment: vi.fn(async (_key: string, amount?: number) => amount ?? 1),
    has: vi.fn(async (key: string) => store.has(key)),
    ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let cache: ICacheService;
  let metrics: MetricsCollector;

  beforeEach(() => {
    cache = createMockCache();
    metrics = new MetricsCollector();
    service = new AnalyticsService(
      cache,
      createMockLogger(),
      createMockEventBus(),
      metrics,
    );
  });

  describe('track', () => {
    it('should track an analytics event', async () => {
      const result = await service.track({
        name: 'page_view',
        organizationId: 'org-1',
        userId: 'user-1',
        properties: { page: '/dashboard' },
      });

      expect(result.success).toBe(true);
    });

    it('should not fail when cache errors', async () => {
      (cache.set as any).mockRejectedValue(new Error('cache error'));

      const result = await service.track({
        name: 'test_event',
        organizationId: 'org-1',
      });

      expect(result.success).toBe(true); // Non-blocking
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter', async () => {
      const result = await service.incrementCounter('requests', 'org-1', 5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });
  });

  describe('getCounter', () => {
    it('should return 0 when no counter exists', async () => {
      const result = await service.getCounter('missing', 'org-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  describe('getUsageMetrics', () => {
    it('should return usage metrics', async () => {
      const result = await service.getUsageMetrics('org-1', '2024-01');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.organizationId).toBe('org-1');
        expect(result.data.period).toBe('2024-01');
      }
    });
  });

  describe('getTopEvents', () => {
    it('should return top events list', async () => {
      const result = await service.getTopEvents('org-1', 5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });
});
