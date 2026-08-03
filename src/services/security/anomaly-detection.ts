/**
 * Anomaly Detection Service
 *
 * Statistical anomaly detection for usage patterns, cost spikes, and behavioral changes.
 */

import type { IRedisClient } from '../../infrastructure/redis/redis-client.js';

interface Anomaly {
  readonly type: 'usage_spike' | 'cost_spike' | 'error_spike' | 'new_pattern' | 'geographic' | 'time_anomaly';
  readonly metric: string;
  readonly currentValue: number;
  readonly expectedValue: number;
  readonly deviation: number; // standard deviations from mean
  readonly severity: 'low' | 'medium' | 'high';
  readonly context: Record<string, unknown>;
}

interface UsageSnapshot {
  readonly timestamp: number;
  readonly requests: number;
  readonly tokens: number;
  readonly errors: number;
  readonly cost: number;
}

export class AnomalyDetectionService {
  constructor(
    private readonly redis: IRedisClient,
  ) {}

  async recordUsage(orgId: string, metrics: { requests: number; tokens: number; errors: number; cost: number }): Promise<void> {
    const key = `anomaly:usage:${orgId}`;
    const snapshot: UsageSnapshot = { ...metrics, timestamp: Date.now() };
    await this.redis.lpush(key, JSON.stringify(snapshot));
    await this.redis.getClient().ltrim(key, 0, 999); // Keep last 1000 snapshots
    await this.redis.expire(key, 7 * 86400);
  }

  async detectAnomalies(orgId: string): Promise<readonly Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const key = `anomaly:usage:${orgId}`;
    const rawSnapshots = await this.redis.lrange(key, 0, 999);

    if (rawSnapshots.length < 10) return anomalies; // Need minimum data

    const snapshots: UsageSnapshot[] = rawSnapshots.map((s) => JSON.parse(s));

    // Analyze each metric
    for (const metric of ['requests', 'tokens', 'errors', 'cost'] as const) {
      const values = snapshots.map((s) => s[metric]);
      const anomaly = this.detectStatisticalAnomaly(values, metric, orgId);
      if (anomaly) anomalies.push(anomaly);
    }

    // Time-based anomalies
    const timeAnomaly = this.detectTimeAnomaly(snapshots, orgId);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    // Error rate anomalies
    const errorRateAnomaly = this.detectErrorRateAnomaly(snapshots, orgId);
    if (errorRateAnomaly) anomalies.push(errorRateAnomaly);

    return anomalies;
  }

  async getBaseline(orgId: string): Promise<Record<string, { mean: number; stddev: number; p95: number; p99: number }>> {
    const key = `anomaly:usage:${orgId}`;
    const rawSnapshots = await this.redis.lrange(key, 0, 999);
    const snapshots: UsageSnapshot[] = rawSnapshots.map((s) => JSON.parse(s));

    const result: Record<string, { mean: number; stddev: number; p95: number; p99: number }> = {};

    for (const metric of ['requests', 'tokens', 'errors', 'cost'] as const) {
      const values = snapshots.map((s) => s[metric]);
      result[metric] = this.calculateStats(values);
    }

    return result;
  }

  private detectStatisticalAnomaly(values: number[], metric: string, orgId: string): Anomaly | null {
    const current = values[0]!; // Most recent
    const historical = values.slice(1);
    const stats = this.calculateStats(historical);

    if (stats.stddev === 0) return null;

    const deviation = Math.abs(current - stats.mean) / stats.stddev;

    if (deviation > 3) {
      return {
        type: metric === 'cost' ? 'cost_spike' : 'usage_spike',
        metric,
        currentValue: current,
        expectedValue: stats.mean,
        deviation,
        severity: deviation > 5 ? 'high' : 'medium',
        context: { orgId, mean: stats.mean, stddev: stats.stddev, p95: stats.p95 },
      };
    }

    return null;
  }

  private detectTimeAnomaly(snapshots: UsageSnapshot[], orgId: string): Anomaly | null {
    // Check if current hour has unusual activity compared to historical
    const now = new Date();
    const currentHour = now.getHours();

    const sameHourSnapshots = snapshots.filter((s) => new Date(s.timestamp).getHours() === currentHour);
    const otherSnapshots = snapshots.filter((s) => new Date(s.timestamp).getHours() !== currentHour);

    if (sameHourSnapshots.length < 3 || otherSnapshots.length < 10) return null;

    const currentAvg = sameHourSnapshots.reduce((sum, s) => sum + s.requests, 0) / sameHourSnapshots.length;
    const overallAvg = otherSnapshots.reduce((sum, s) => sum + s.requests, 0) / otherSnapshots.length;

    if (currentAvg > overallAvg * 3) {
      return {
        type: 'time_anomaly',
        metric: 'requests_per_hour',
        currentValue: currentAvg,
        expectedValue: overallAvg,
        deviation: currentAvg / overallAvg,
        severity: currentAvg > overallAvg * 5 ? 'high' : 'medium',
        context: { orgId, hour: currentHour },
      };
    }

    return null;
  }

  private detectErrorRateAnomaly(snapshots: UsageSnapshot[], orgId: string): Anomaly | null {
    const recent = snapshots.slice(0, 5);
    const errorRate = recent.reduce((sum, s) => sum + s.errors, 0) / Math.max(1, recent.reduce((sum, s) => sum + s.requests, 0));
    const historicalRate = snapshots.slice(5).reduce((sum, s) => sum + s.errors, 0) / Math.max(1, snapshots.slice(5).reduce((sum, s) => sum + s.requests, 0));

    if (errorRate > historicalRate * 3 && errorRate > 0.05) {
      return {
        type: 'error_spike',
        metric: 'error_rate',
        currentValue: errorRate,
        expectedValue: historicalRate,
        deviation: historicalRate > 0 ? errorRate / historicalRate : 999,
        severity: errorRate > 0.2 ? 'high' : 'medium',
        context: { orgId },
      };
    }

    return null;
  }

  private calculateStats(values: number[]): { mean: number; stddev: number; p95: number; p99: number } {
    if (values.length === 0) return { mean: 0, stddev: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return {
      mean,
      stddev: Math.sqrt(variance),
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }
}
