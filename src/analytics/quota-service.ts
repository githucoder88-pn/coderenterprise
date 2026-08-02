/**
 * Quota Service
 *
 * Organization quota management with real-time tracking,
 * overage detection, and hard/soft limits.
 */

import type { Quota, QuotaCheckResult, SetQuotaSchema } from './types.js';
import type { ICacheService } from '../infrastructure/redis/cache.js';
import type { ILogger } from '../telemetry/logger.js';
import { ErrorCode, type Result } from '../types/index.js';

export interface IQuotaService {
  setQuota(orgId: string, metric: Quota['metric'], limit: number, period?: Quota['period'], hardLimit?: boolean): Result<Quota>;
  checkQuota(orgId: string, metric: Quota['metric'], amount?: number): Promise<QuotaCheckResult>;
  consume(orgId: string, metric: Quota['metric'], amount: number): Promise<QuotaCheckResult>;
  getQuotas(orgId: string): readonly Quota[];
  getUsage(orgId: string): Record<string, { used: number; limit: number; percent: number }>;
  resetQuota(orgId: string, metric: Quota['metric']): Promise<void>;
  resetAll(orgId: string): Promise<void>;
  removeQuota(orgId: string, metric: Quota['metric']): void;
}

export class QuotaService implements IQuotaService {
  private readonly quotas = new Map<string, Quota>();
  private readonly usageCounters = new Map<string, number>();

  constructor(
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  setQuota(orgId: string, metric: Quota['metric'], limit: number, period: Quota['period'] = 'monthly', hardLimit = false): Result<Quota> {
    const id = `${orgId}:${metric}`;
    const now = new Date();
    const quota: Quota = {
      id, organizationId: orgId, metric, limit, used: 0,
      period, resetAt: this.calculateResetAt(period), overage: 0,
      hardLimit, createdAt: now, updatedAt: now,
    };
    this.quotas.set(id, quota);
    this.usageCounters.set(id, 0);
    return { success: true, data: quota };
  }

  async checkQuota(orgId: string, metric: Quota['metric'], amount = 1): Promise<QuotaCheckResult> {
    const id = `${orgId}:${metric}`;
    const quota = this.quotas.get(id);
    if (!quota) {
      // No quota set — allow by default
      return {
        allowed: true,
        quota: { id, organizationId: orgId, metric, limit: Infinity, used: 0, period: 'monthly', resetAt: new Date(), overage: 0, hardLimit: false, createdAt: new Date(), updatedAt: new Date() },
        remaining: Infinity, percentUsed: 0, willResetAt: new Date(),
      };
    }

    // Check if reset needed
    if (quota.resetAt <= new Date()) {
      await this.resetQuota(orgId, metric);
    }

    const used = this.usageCounters.get(id) ?? 0;
    const remaining = Math.max(0, quota.limit - used);
    const percentUsed = quota.limit > 0 ? (used / quota.limit) * 100 : 0;

    return {
      allowed: quota.hardLimit ? used + amount <= quota.limit : true,
      quota: { ...quota, used },
      remaining, percentUsed, willResetAt: quota.resetAt,
    };
  }

  async consume(orgId: string, metric: Quota['metric'], amount: number): Promise<QuotaCheckResult> {
    const id = `${orgId}:${metric}`;
    const check = await this.checkQuota(orgId, metric, amount);

    if (!check.allowed) {
      this.logger.warn({ orgId, metric, used: check.quota.used, limit: check.quota.limit }, 'Hard quota exceeded');
      return check;
    }

    const current = this.usageCounters.get(id) ?? 0;
    this.usageCounters.set(id, current + amount);

    const quota = this.quotas.get(id);
    if (quota) {
      const overage = Math.max(0, (current + amount) - quota.limit);
      this.quotas.set(id, { ...quota, used: current + amount, overage, updatedAt: new Date() });

      if (overage > 0 && !quota.hardLimit) {
        this.logger.warn({ orgId, metric, overage }, 'Soft quota exceeded — overage detected');
      }
    }

    return { ...check, remaining: Math.max(0, check.remaining - amount), percentUsed: ((current + amount) / Math.max(1, check.quota.limit)) * 100 };
  }

  getQuotas(orgId: string): readonly Quota[] {
    return [...this.quotas.values()].filter((q) => q.organizationId === orgId);
  }

  getUsage(orgId: string): Record<string, { used: number; limit: number; percent: number }> {
    const result: Record<string, { used: number; limit: number; percent: number }> = {};
    for (const quota of this.getQuotas(orgId)) {
      const used = this.usageCounters.get(quota.id) ?? 0;
      result[quota.metric] = { used, limit: quota.limit, percent: quota.limit > 0 ? (used / quota.limit) * 100 : 0 };
    }
    return result;
  }

  async resetQuota(orgId: string, metric: Quota['metric']): Promise<void> {
    const id = `${orgId}:${metric}`;
    const quota = this.quotas.get(id);
    if (!quota) return;

    this.usageCounters.set(id, 0);
    this.quotas.set(id, { ...quota, used: 0, overage: 0, resetAt: this.calculateResetAt(quota.period), updatedAt: new Date() });
    this.logger.info({ orgId, metric }, 'Quota reset');
  }

  async resetAll(orgId: string): Promise<void> {
    for (const quota of this.getQuotas(orgId)) {
      await this.resetQuota(orgId, quota.metric);
    }
  }

  removeQuota(orgId: string, metric: Quota['metric']): void {
    const id = `${orgId}:${metric}`;
    this.quotas.delete(id);
    this.usageCounters.delete(id);
  }

  private calculateResetAt(period: Quota['period']): Date {
    const now = new Date();
    switch (period) {
      case 'daily': {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'monthly': {
        const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return d;
      }
      case 'yearly': {
        return new Date(now.getFullYear() + 1, 0, 1);
      }
      case 'total':
        return new Date(2099, 0, 1);
    }
  }
}
