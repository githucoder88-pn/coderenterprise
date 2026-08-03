/**
 * Usage Tracker
 *
 * Tracks API usage, tokens, costs, and request metadata.
 * Writes to Firestore for persistence and Redis for real-time counters.
 */

import type { UsageRecord, UsageAggregate, UsageSummary, CostEstimate, PricingTable, ModelStats } from './types.js';
import type { ICacheService } from '../infrastructure/redis/cache.js';
import type { ILogger } from '../telemetry/logger.js';
import type { ProviderName } from '../modules/providers/types.js';
import { type Result, createPaginatedResponse, type PaginationParams, type PaginatedResponse } from '../types/index.js';

export interface IUsageTracker {
  track(record: Omit<UsageRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalTokens' | 'estimatedCost' | 'currency'>): Promise<Result<UsageRecord>>;
  getUsage(orgId: string, period: string): Promise<UsageAggregate>;
  getSummary(orgId: string, period: string): Promise<UsageSummary>;
  getModelStats(orgId: string, period: string): Promise<readonly ModelStats[]>;
  estimateCost(model: string, provider: ProviderName, promptTokens: number, completionTokens: number, cachedTokens?: number): CostEstimate;
  getRecords(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<UsageRecord>>;
  getRecordsByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResponse<UsageRecord>>;
  getPricingTable(): readonly PricingTable[];
  updatePricing(model: string, provider: ProviderName, inputPerMillion: number, outputPerMillion: number): void;
}

export class UsageTracker implements IUsageTracker {
  private readonly records: UsageRecord[] = [];
  private readonly pricing = new Map<string, PricingTable>();

  constructor(
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {
    // Default pricing — in production, synced from provider APIs
    this.initDefaultPricing();
  }

  async track(input: Omit<UsageRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalTokens' | 'estimatedCost' | 'currency'>): Promise<Result<UsageRecord>> {
    const totalTokens = input.promptTokens + input.completionTokens;
    const estimate = this.estimateCost(input.model, input.provider, input.promptTokens, input.completionTokens, input.cachedTokens);

    const record: UsageRecord = {
      ...input, id: crypto.randomUUID(),
      totalTokens, estimatedCost: estimate.estimatedCost, currency: 'USD',
      createdAt: new Date(), updatedAt: new Date(),
    };

    this.records.push(record);

    // Update real-time counters in cache
    const day = new Date().toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    await Promise.all([
      this.cache.increment(`usage:${input.organizationId}:${day}:requests`),
      this.cache.increment(`usage:${input.organizationId}:${day}:tokens`)?.then(() => {}),
      this.cache.increment(`usage:${input.organizationId}:${month}:requests`),
    ]);

    this.logger.debug({
      orgId: input.organizationId, model: input.model, provider: input.provider,
      tokens: totalTokens, cost: estimate.estimatedCost,
    }, 'Usage tracked');

    return { success: true, data: record };
  }

  async getUsage(orgId: string, period: string): Promise<UsageAggregate> {
    const filtered = this.records.filter((r) => r.organizationId === orgId && this.matchesPeriod(r.createdAt, period));
    return this.aggregate(filtered, period, orgId);
  }

  async getSummary(orgId: string, period: string): Promise<UsageSummary> {
    const current = await this.getUsage(orgId, period);
    const prevPeriod = this.getPreviousPeriod(period);
    const previous = prevPeriod ? await this.getUsage(orgId, prevPeriod) : null;

    const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const r of this.records.filter((r) => r.organizationId === orgId && this.matchesPeriod(r.createdAt, period))) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { requests: 0, tokens: 0, cost: 0 };
      entry.requests++;
      entry.tokens += r.totalTokens;
      entry.cost += r.estimatedCost;
      dailyMap.set(day, entry);
    }

    return {
      organizationId: orgId, currentPeriod: current, previousPeriod: previous,
      trend: {
        requestsDelta: previous ? ((current.totalRequests - previous.totalRequests) / Math.max(1, previous.totalRequests)) * 100 : 0,
        tokensDelta: previous ? ((current.totalTokens - previous.totalTokens) / Math.max(1, previous.totalTokens)) * 100 : 0,
        costDelta: previous ? ((current.totalCost - previous.totalCost) / Math.max(1, previous.totalCost)) * 100 : 0,
      },
      topModels: Object.entries(current.byModel).map(([model, data]) => ({ model, ...data })).sort((a, b) => b.requests - a.requests).slice(0, 10),
      topUsers: Object.entries(current.byUser).map(([userId, data]) => ({ userId, ...data })).sort((a, b) => b.requests - a.requests).slice(0, 10),
      dailyBreakdown: [...dailyMap.entries()].map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getModelStats(orgId: string, period: string): Promise<readonly ModelStats[]> {
    const filtered = this.records.filter((r) => r.organizationId === orgId && this.matchesPeriod(r.createdAt, period));
    const modelMap = new Map<string, { records: UsageRecord[]; provider: ProviderName }>();

    for (const r of filtered) {
      const key = `${r.provider}/${r.model}`;
      if (!modelMap.has(key)) modelMap.set(key, { records: [], provider: r.provider });
      modelMap.get(key)!.records.push(r);
    }

    const stats: ModelStats[] = [];
    for (const [modelKey, { records, provider }] of modelMap) {
      const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b);
      const errors = records.filter((r) => r.status !== 'success').length;
      stats.push({
        model: modelKey.split('/').slice(1).join('/'), provider,
        totalRequests: records.length,
        totalTokens: records.reduce((s, r) => s + r.totalTokens, 0),
        totalCost: records.reduce((s, r) => s + r.estimatedCost, 0),
        avgLatencyMs: latencies.reduce((s, l) => s + l, 0) / Math.max(1, latencies.length),
        p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
        errorRate: errors / Math.max(1, records.length),
        successRate: (records.length - errors) / Math.max(1, records.length),
        avgTokensPerRequest: records.reduce((s, r) => s + r.totalTokens, 0) / Math.max(1, records.length),
        lastUsedAt: records[records.length - 1]!.createdAt,
        period,
      });
    }

    return stats.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  estimateCost(model: string, provider: ProviderName, promptTokens: number, completionTokens: number, cachedTokens = 0): CostEstimate {
    const key = `${provider}/${model}`;
    const pricing = this.pricing.get(key) ?? this.pricing.get(`${provider}/*`) ?? { inputPerMillion: 1, outputPerMillion: 3, cachedInputPerMillion: 0.5, currency: 'USD' };

    const effectiveInputTokens = Math.max(0, promptTokens - cachedTokens);
    const inputCost = (effectiveInputTokens / 1_000_000) * pricing.inputPerMillion;
    const cachedCost = (cachedTokens / 1_000_000) * pricing.cachedInputPerMillion;
    const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;

    return {
      model, provider, promptTokens, completionTokens,
      estimatedCost: inputCost + cachedCost + outputCost,
      currency: pricing.currency,
      breakdown: { inputCost, outputCost, cachedDiscount: (cachedTokens / 1_000_000) * (pricing.inputPerMillion - pricing.cachedInputPerMillion) },
    };
  }

  async getRecords(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<UsageRecord>> {
    const filtered = this.records.filter((r) => r.organizationId === orgId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(filtered.slice(start, start + pagination.limit), filtered.length, pagination);
  }

  async getRecordsByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResponse<UsageRecord>> {
    const filtered = this.records.filter((r) => r.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(filtered.slice(start, start + pagination.limit), filtered.length, pagination);
  }

  getPricingTable(): readonly PricingTable[] {
    return [...this.pricing.values()];
  }

  updatePricing(model: string, provider: ProviderName, inputPerMillion: number, outputPerMillion: number): void {
    const key = `${provider}/${model}`;
    this.pricing.set(key, {
      model, provider, inputPerMillion, outputPerMillion,
      cachedInputPerMillion: inputPerMillion * 0.5, currency: 'USD', effectiveFrom: new Date(),
    });
  }

  private aggregate(records: readonly UsageRecord[], period: string, orgId: string): UsageAggregate {
    const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const byUser: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const byRequestType: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const latencies: number[] = [];
    let errors = 0;

    for (const r of records) {
      this.addToMap(byModel, r.model, r);
      this.addToMap(byProvider, r.provider, r);
      this.addToMap(byUser, r.userId, r);
      this.addToMap(byRequestType, r.requestType, r);
      latencies.push(r.latencyMs);
      if (r.status !== 'success') errors++;
    }

    latencies.sort((a, b) => a - b);

    return {
      period, organizationId: orgId,
      totalRequests: records.length,
      totalTokens: records.reduce((s, r) => s + r.totalTokens, 0),
      totalCost: records.reduce((s, r) => s + r.estimatedCost, 0),
      byModel, byProvider, byUser, byRequestType,
      errorRate: errors / Math.max(1, records.length),
      avgLatencyMs: latencies.reduce((s, l) => s + l, 0) / Math.max(1, latencies.length),
      p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
      p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
    };
  }

  private addToMap(map: Record<string, { requests: number; tokens: number; cost: number }>, key: string, record: UsageRecord): void {
    if (!map[key]) map[key] = { requests: 0, tokens: 0, cost: 0 };
    map[key]!.requests++;
    map[key]!.tokens += record.totalTokens;
    map[key]!.cost += record.estimatedCost;
  }

  private matchesPeriod(date: Date, period: string): boolean {
    const dateStr = date.toISOString().slice(0, 10);
    const month = dateStr.slice(0, 7);
    const year = dateStr.slice(0, 4);
    return dateStr === period || month === period || year === period;
  }

  private getPreviousPeriod(period: string): string | null {
    if (period.length === 10) {
      const d = new Date(period);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
    if (period.length === 7) {
      const [y, m] = period.split('-').map(Number);
      const d = new Date(y!, (m ?? 1) - 2, 1);
      return d.toISOString().slice(0, 7);
    }
    return null;
  }

  private initDefaultPricing(): void {
    const defaults: [string, PricingTable][] = [
      ['openai/gpt-4o', { model: 'gpt-4o', provider: 'openai', inputPerMillion: 2.5, outputPerMillion: 10, cachedInputPerMillion: 1.25, currency: 'USD', effectiveFrom: new Date() }],
      ['openai/gpt-4o-mini', { model: 'gpt-4o-mini', provider: 'openai', inputPerMillion: 0.15, outputPerMillion: 0.6, cachedInputPerMillion: 0.075, currency: 'USD', effectiveFrom: new Date() }],
      ['anthropic/claude-sonnet-4-20250514', { model: 'claude-sonnet-4-20250514', provider: 'anthropic', inputPerMillion: 3, outputPerMillion: 15, cachedInputPerMillion: 0.3, currency: 'USD', effectiveFrom: new Date() }],
      ['anthropic/claude-3-5-haiku-20241022', { model: 'claude-3-5-haiku-20241022', provider: 'anthropic', inputPerMillion: 0.8, outputPerMillion: 4, cachedInputPerMillion: 0.08, currency: 'USD', effectiveFrom: new Date() }],
      ['groq/llama-3.1-70b-versatile', { model: 'llama-3.1-70b-versatile', provider: 'groq', inputPerMillion: 0.59, outputPerMillion: 0.79, cachedInputPerMillion: 0.3, currency: 'USD', effectiveFrom: new Date() }],
      ['gemini/gemini-1.5-pro', { model: 'gemini-1.5-pro', provider: 'gemini', inputPerMillion: 1.25, outputPerMillion: 5, cachedInputPerMillion: 0.3125, currency: 'USD', effectiveFrom: new Date() }],
    ];
    for (const [key, pricing] of defaults) this.pricing.set(key, pricing);
  }
}
