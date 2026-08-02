/**
 * Health Service
 *
 * Deep and shallow health checks for the entire system.
 */

import { BaseService } from '../../core/base-service.js';
import type { RedisProvider } from '../../providers/redis.provider.js';
import type { FirebaseProvider } from '../../providers/firebase.provider.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import { type Result } from '../../types/index.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly version: string;
  readonly uptime: number;
  readonly timestamp: string;
  readonly checks: Record<string, {
    readonly status: HealthStatus;
    readonly latencyMs: number;
    readonly message?: string;
  }>;
}

export interface IHealthService {
  shallow(): Promise<Result<{ status: string; uptime: number }>>;
  deep(): Promise<Result<HealthCheckResult>>;
}

export class HealthService extends BaseService implements IHealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly redis: RedisProvider,
    private readonly firebase: FirebaseProvider,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async shallow(): Promise<Result<{ status: string; uptime: number }>> {
    return this.success({
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
    });
  }

  async deep(): Promise<Result<HealthCheckResult>> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: HealthStatus = 'healthy';

    // Redis check
    const redisStart = performance.now();
    try {
      const ok = await this.redis.healthCheck();
      const latency = performance.now() - redisStart;
      checks['redis'] = {
        status: ok ? 'healthy' : 'unhealthy',
        latencyMs: Math.round(latency * 100) / 100,
      };
      if (!ok) overallStatus = 'degraded';
    } catch (error) {
      checks['redis'] = {
        status: 'unhealthy',
        latencyMs: Math.round((performance.now() - redisStart) * 100) / 100,
        message: error instanceof Error ? error.message : String(error),
      };
      overallStatus = 'degraded';
    }

    // Firebase checks
    const firebaseStart = performance.now();
    try {
      const fbHealth = await this.firebase.healthCheck();
      const latency = performance.now() - firebaseStart;

      checks['firestore'] = {
        status: fbHealth.firestore ? 'healthy' : 'unhealthy',
        latencyMs: Math.round(latency * 100) / 100,
      };

      checks['auth'] = {
        status: fbHealth.auth ? 'healthy' : 'unhealthy',
        latencyMs: Math.round(latency * 100) / 100,
      };

      checks['storage'] = {
        status: fbHealth.storage ? 'healthy' : 'unhealthy',
        latencyMs: Math.round(latency * 100) / 100,
      };

      if (!fbHealth.firestore || !fbHealth.auth) {
        overallStatus = 'unhealthy';
      } else if (!fbHealth.storage) {
        overallStatus = 'degraded';
      }
    } catch (error) {
      const latency = performance.now() - firebaseStart;
      checks['firebase'] = {
        status: 'unhealthy',
        latencyMs: Math.round(latency * 100) / 100,
        message: error instanceof Error ? error.message : String(error),
      };
      overallStatus = 'unhealthy';
    }

    return this.success({
      status: overallStatus,
      version: '1.0.0',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    });
  }
}
