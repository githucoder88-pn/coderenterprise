/**
 * Billing Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BillingService } from '../../../modules/billing/billing.service.js';
import { createMockLogger, createMockEventBus } from '../../helpers.js';
import { AnalyticsService } from '../../../modules/analytics/analytics.service.js';
import { MetricsCollector } from '../../../telemetry/metrics.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';
import { vi } from 'vitest';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0),
    getOrSet: vi.fn(async (_key: string, factory: () => Promise<any>) => factory()),
    increment: vi.fn(async () => 0),
    has: vi.fn(async () => false),
    ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    const cache = createMockCache();
    const analytics = new AnalyticsService(
      cache,
      createMockLogger(),
      createMockEventBus(),
      new MetricsCollector(),
    );
    service = new BillingService(createMockLogger(), createMockEventBus(), analytics);
  });

  describe('getPlans', () => {
    it('should return all plans', async () => {
      const result = await service.getPlans();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(4);
        expect(result.data.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'enterprise']);
      }
    });
  });

  describe('getPlan', () => {
    it('should return a specific plan', async () => {
      const result = await service.getPlan('pro');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Pro');
        expect(result.data.price).toBe(99);
      }
    });

    it('should fail for non-existent plan', async () => {
      const result = await service.getPlan('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('getSubscription', () => {
    it('should return null for new org', async () => {
      const result = await service.getSubscription('org-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const result = await service.createCheckoutSession('org-1', 'pro');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBeDefined();
      }
    });

    it('should fail for unknown plan', async () => {
      const result = await service.createCheckoutSession('org-1', 'unknown');
      expect(result.success).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel successfully', async () => {
      const result = await service.cancelSubscription('org-1');
      expect(result.success).toBe(true);
    });
  });

  describe('checkUsageLimits', () => {
    it('should return allowed status', async () => {
      const result = await service.checkUsageLimits('org-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowed).toBe(true);
        expect(result.data.remaining).toBeDefined();
      }
    });
  });
});
