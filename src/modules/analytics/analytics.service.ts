/**
 * Analytics Service
 *
 * Tracks usage metrics, event counts, and aggregation.
 */

import { BaseService } from '../../core/base-service.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { IMetrics } from '../../telemetry/metrics.js';
import { type Result } from '../../types/index.js';

export interface AnalyticsEvent {
  readonly name: string;
  readonly organizationId: string;
  readonly userId?: string;
  readonly properties?: Record<string, unknown>;
  readonly timestamp?: Date;
}

export interface UsageMetrics {
  readonly organizationId: string;
  readonly period: string;
  readonly requestCount: number;
  readonly uniqueUsers: number;
  readonly errorCount: number;
  readonly avgResponseTime: number;
}

export interface IAnalyticsService {
  track(event: AnalyticsEvent): Promise<Result<void>>;
  incrementCounter(name: string, organizationId: string, amount?: number): Promise<Result<number>>;
  getCounter(name: string, organizationId: string): Promise<Result<number>>;
  getUsageMetrics(organizationId: string, period: string): Promise<Result<UsageMetrics>>;
  getTopEvents(organizationId: string, limit?: number): Promise<Result<readonly { name: string; count: number }[]>>;
}

export class AnalyticsService extends BaseService implements IAnalyticsService {
  constructor(
    private readonly cache: ICacheService,
    logger: ILogger,
    eventBus: IEventBus,
    private readonly metrics: IMetrics,
  ) {
    super(logger, eventBus);
  }

  async track(event: AnalyticsEvent): Promise<Result<void>> {
    try {
      const ts = event.timestamp ?? new Date();
      const day = ts.toISOString().slice(0, 10);

      // Increment event counter
      await this.incrementCounter(event.name, event.organizationId);

      // Track in metrics
      this.metrics.increment('analytics_events_total', {
        name: event.name,
        organizationId: event.organizationId,
      });

      // Store event for aggregation
      const key = `analytics:events:${event.organizationId}:${day}`;
      await this.cache.set(
        `${key}:${Date.now()}`,
        { ...event, timestamp: ts },
        86400 * 7, // 7 days retention
      );

      return this.success(undefined);
    } catch (error) {
      this.logger.warn({ error, event }, 'Failed to track analytics event');
      return this.success(undefined); // Non-blocking
    }
  }

  async incrementCounter(
    name: string,
    organizationId: string,
    amount = 1,
  ): Promise<Result<number>> {
    const key = `analytics:counters:${organizationId}:${name}`;
    const value = await this.cache.increment(key, amount);
    return this.success(value);
  }

  async getCounter(
    name: string,
    organizationId: string,
  ): Promise<Result<number>> {
    const key = `analytics:counters:${organizationId}:${name}`;
    const cached = await this.cache.get<number>(key);
    return this.success(cached ?? 0);
  }

  async getUsageMetrics(
    organizationId: string,
    period: string,
  ): Promise<Result<UsageMetrics>> {
    const [requestCount, errorCount] = await Promise.all([
      this.getCounter(`requests:${period}`, organizationId),
      this.getCounter(`errors:${period}`, organizationId),
    ]);

    return this.success({
      organizationId,
      period,
      requestCount: requestCount.success ? requestCount.data : 0,
      uniqueUsers: 0, // Would require a Set data structure in production
      errorCount: errorCount.success ? errorCount.data : 0,
      avgResponseTime: 0, // Would require histogram data
    });
  }

  async getTopEvents(
    organizationId: string,
    limit = 10,
  ): Promise<Result<readonly { name: string; count: number }[]>> {
    // In production, use Redis sorted sets for efficient ranking
    this.logger.debug({ organizationId, limit }, 'Getting top events');
    return this.success([]);
  }
}
