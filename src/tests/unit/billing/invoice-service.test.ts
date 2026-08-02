/**
 * Invoice Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceService } from '../../../analytics/invoice-service.js';
import { UsageTracker } from '../../../analytics/usage-tracker.js';
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

describe('InvoiceService', () => {
  let service: InvoiceService;
  let usageTracker: UsageTracker;

  beforeEach(() => {
    usageTracker = new UsageTracker(createMockCache(), createMockLogger());
    service = new InvoiceService(usageTracker, createMockLogger());
  });

  describe('generate', () => {
    it('should generate invoice from usage records', async () => {
      // Add usage records
      await usageTracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 10000, completionTokens: 5000, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });

      const now = new Date();
      const periodStart = new Date(now.getTime() - 30 * 86400_000);
      const result = await service.generate('org-1', periodStart, now);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toMatch(/^INV-/);
        expect(result.data.status).toBe('open');
        expect(result.data.total).toBeGreaterThan(0);
        expect(result.data.lineItems.length).toBeGreaterThan(0);
      }
    });

    it('should fail with no usage', async () => {
      const now = new Date();
      const result = await service.generate('org-empty', new Date(now.getTime() - 86400_000), now);
      expect(result.success).toBe(false);
    });
  });

  describe('markPaid', () => {
    it('should mark invoice as paid', async () => {
      await usageTracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });

      const now = new Date();
      const invoice = (await service.generate('org-1', new Date(now.getTime() - 86400_000), now)).data!;
      const paid = await service.markPaid(invoice.id);

      expect(paid.success).toBe(true);
      if (paid.success) {
        expect(paid.data.status).toBe('paid');
        expect(paid.data.paidAt).toBeDefined();
      }
    });
  });

  describe('void', () => {
    it('should void an invoice', async () => {
      await usageTracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });
      const now = new Date();
      const invoice = (await service.generate('org-1', new Date(now.getTime() - 86400_000), now)).data!;
      const voided = await service.void(invoice.id);
      expect(voided.success).toBe(true);
      if (voided.success) expect(voided.data.status).toBe('void');
    });
  });

  describe('generateSummary', () => {
    it('should generate invoice summary', async () => {
      await usageTracker.track({
        organizationId: 'org-1', userId: 'u1', model: 'gpt-4o', provider: 'openai',
        promptTokens: 1000, completionTokens: 500, cachedTokens: 0, reasoningTokens: 0,
        requestType: 'completion', latencyMs: 100, status: 'success', metadata: {},
      });
      const now = new Date();
      await service.generate('org-1', new Date(now.getTime() - 86400_000), now);

      const summary = await service.generateSummary('org-1', new Date().toISOString().slice(0, 7));
      expect(summary.totalInvoices).toBeGreaterThanOrEqual(1);
      expect(summary.totalAmount).toBeGreaterThan(0);
    });
  });
});
