/**
 * Subscription Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../../../analytics/subscription-service.js';
import { QuotaService } from '../../../analytics/quota-service.js';
import { createMockLogger } from '../../helpers.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0), getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async () => 0), has: vi.fn(async () => false), ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let quotas: QuotaService;

  beforeEach(() => {
    quotas = new QuotaService(createMockCache(), createMockLogger());
    service = new SubscriptionService(quotas, createMockLogger());
  });

  describe('listPlans', () => {
    it('should return all default plans', () => {
      const plans = service.listPlans();
      expect(plans.length).toBe(4);
      expect(plans.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'enterprise']);
    });

    it('should have progressive pricing', () => {
      const plans = service.listPlans();
      expect(plans[0]!.price).toBe(0);
      expect(plans[1]!.price).toBeLessThan(plans[2]!.price);
      expect(plans[2]!.price).toBeLessThan(plans[3]!.price);
    });
  });

  describe('create', () => {
    it('should create a subscription', async () => {
      const result = await service.create('org-1', 'pro');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.planId).toBe('pro');
        expect(result.data.status).toBe('active');
      }
    });

    it('should create with trial', async () => {
      const result = await service.create('org-1', 'pro', 14);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('trialing');
        expect(result.data.trialEnd).toBeDefined();
      }
    });

    it('should set quotas from plan', async () => {
      await service.create('org-1', 'starter');
      const q = quotas.getQuotas('org-1');
      expect(q.length).toBeGreaterThan(0);
    });

    it('should reject duplicate active subscription', async () => {
      await service.create('org-1', 'pro');
      const result = await service.create('org-1', 'enterprise');
      expect(result.success).toBe(false);
    });

    it('should reject unknown plan', async () => {
      const result = await service.create('org-1', 'nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('upgrade', () => {
    it('should upgrade plan', async () => {
      await service.create('org-1', 'starter');
      const result = await service.upgrade('org-1', 'pro');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.planId).toBe('pro');
    });

    it('should reject upgrade to lower plan', async () => {
      await service.create('org-1', 'pro');
      const result = await service.upgrade('org-1', 'starter');
      expect(result.success).toBe(false);
    });
  });

  describe('downgrade', () => {
    it('should downgrade plan', async () => {
      await service.create('org-1', 'pro');
      const result = await service.downgrade('org-1', 'starter');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.planId).toBe('starter');
    });
  });

  describe('cancel', () => {
    it('should cancel at period end', async () => {
      await service.create('org-1', 'pro');
      const result = await service.cancel('org-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cancelAt).toBeDefined();
        expect(result.data.status).toBe('active'); // Still active until cancelAt
      }
    });

    it('should cancel immediately', async () => {
      await service.create('org-1', 'pro');
      const result = await service.cancel('org-1', true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('canceled');
        expect(result.data.canceledAt).toBeDefined();
      }
    });
  });

  describe('reactivate', () => {
    it('should reactivate canceled subscription', async () => {
      await service.create('org-1', 'pro');
      await service.cancel('org-1', true);
      const result = await service.reactivate('org-1');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('active');
    });
  });

  describe('checkAccess', () => {
    it('should check feature access by plan', async () => {
      await service.create('org-1', 'free');
      expect(service.checkAccess('org-1', 'basic_api')).toBe(true);
      expect(service.checkAccess('org-1', 'sso')).toBe(false);
    });

    it('should grant all features on enterprise', async () => {
      await service.create('org-1', 'enterprise');
      expect(service.checkAccess('org-1', 'sso')).toBe(true);
      expect(service.checkAccess('org-1', 'audit_logs')).toBe(true);
    });
  });

  describe('checkModelAccess', () => {
    it('should allow all models on any plan', async () => {
      await service.create('org-1', 'free');
      expect(service.checkModelAccess('org-1', 'gpt-4o')).toBe(true);
    });
  });
});
