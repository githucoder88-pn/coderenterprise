/**
 * Quota Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('QuotaService', () => {
  let service: QuotaService;

  beforeEach(() => {
    service = new QuotaService(createMockLogger());
  });

  describe('setQuota', () => {
    it('should set a quota', () => {
      const result = service.setQuota('org-1', 'requests', 10000, 'monthly', true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10000);
        expect(result.data.hardLimit).toBe(true);
      }
    });
  });

  describe('checkQuota', () => {
    it('should allow when under quota', async () => {
      service.setQuota('org-1', 'requests', 1000);
      const result = await service.checkQuota('org-1', 'requests', 1);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1000);
    });

    it('should block when hard limit exceeded', async () => {
      service.setQuota('org-1', 'requests', 2, 'monthly', true);
      await service.consume('org-1', 'requests', 2);
      const result = await service.checkQuota('org-1', 'requests', 1);
      expect(result.allowed).toBe(false);
    });

    it('should allow when soft limit exceeded', async () => {
      service.setQuota('org-1', 'requests', 2, 'monthly', false);
      await service.consume('org-1', 'requests', 5);
      const result = await service.checkQuota('org-1', 'requests', 1);
      expect(result.allowed).toBe(true);
    });

    it('should allow when no quota set', async () => {
      const result = await service.checkQuota('org-1', 'requests');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('consume', () => {
    it('should consume quota', async () => {
      service.setQuota('org-1', 'tokens', 10000);
      await service.consume('org-1', 'tokens', 3000);
      const usage = service.getUsage('org-1');
      expect(usage['tokens']!.used).toBe(3000);
    });

    it('should track overage', async () => {
      service.setQuota('org-1', 'tokens', 1000, 'monthly', false);
      await service.consume('org-1', 'tokens', 1500);
      const quotas = service.getQuotas('org-1');
      expect(quotas[0]!.overage).toBe(500);
    });
  });

  describe('resetQuota', () => {
    it('should reset usage counter', async () => {
      service.setQuota('org-1', 'requests', 100);
      await service.consume('org-1', 'requests', 50);
      await service.resetQuota('org-1', 'requests');
      const usage = service.getUsage('org-1');
      expect(usage['requests']!.used).toBe(0);
    });
  });

  describe('getQuotas', () => {
    it('should list all quotas for org', () => {
      service.setQuota('org-1', 'requests', 1000);
      service.setQuota('org-1', 'tokens', 100000);
      service.setQuota('org-2', 'requests', 500);

      const quotas = service.getQuotas('org-1');
      expect(quotas.length).toBe(2);
    });
  });

  describe('getUsage', () => {
    it('return usage percentages', async () => {
      service.setQuota('org-1', 'requests', 100);
      await service.consume('org-1', 'requests', 75);

      const usage = service.getUsage('org-1');
      expect(usage['requests']!.percent).toBe(75);
    });
  });
});
