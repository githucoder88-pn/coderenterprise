/**
 * Telemetry Integrations
 *
 * OpenTelemetry traces, Prometheus metrics, Sentry errors, Grafana dashboards.
 */

import type { ILogger } from './logger.js';
import type { IMetrics } from './metrics.js';
import type { IObservability } from './observability.js';

// ─── OpenTelemetry Integration ───────────────────────────────────────────────

export interface OtelConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly endpoint: string;
  readonly sampleRate: number;
  readonly resourceAttributes: Record<string, string>;
}

export class OpenTelemetryIntegration {
  private initialized = false;

  constructor(
    private readonly config: OtelConfig,
    private readonly logger: ILogger,
  ) {}

  initialize(): void {
    if (this.initialized) return;
    this.logger.info({
      serviceName: this.config.serviceName,
      endpoint: this.config.endpoint,
      sampleRate: this.config.sampleRate,
    }, 'OpenTelemetry initialized');
    this.initialized = true;
  }

  shutdown(): void {
    this.logger.info('OpenTelemetry shut down');
    this.initialized = false;
  }

  getConfig(): OtelConfig {
    return this.config;
  }
}

// ─── Sentry Integration ──────────────────────────────────────────────────────

export interface SentryConfig {
  readonly dsn: string;
  readonly environment: string;
  readonly release: string;
  readonly sampleRate: number;
  readonly tracesSampleRate: number;
  readonly beforeSend?: (event: Record<string, unknown>) => Record<string, unknown> | null;
}

export class SentryIntegration {
  private initialized = false;
  private readonly breadcrumbs: { category: string; message: string; data?: unknown; timestamp: Date }[] = [];
  private userContext: { id: string; email?: string; organizationId?: string } | null = null;

  constructor(
    private readonly config: SentryConfig,
    private readonly logger: ILogger,
  ) {}

  initialize(): void {
    if (this.initialized) return;
    this.logger.info({ environment: this.config.environment, release: this.config.release }, 'Sentry initialized');
    this.initialized = true;
  }

  captureException(error: Error, context?: Record<string, unknown>): string {
    const eventId = crypto.randomUUID();
    this.logger.error({ eventId, error: error.message, stack: error.stack, context, user: this.userContext }, 'Sentry: Exception captured');
    return eventId;
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'fatal', context?: Record<string, unknown>): string {
    const eventId = crypto.randomUUID();
    const logFn = level === 'fatal' ? this.logger.fatal
      : level === 'error' ? this.logger.error
      : level === 'warning' ? this.logger.warn
      : this.logger.info;
    logFn.call(this.logger, { eventId, message, context }, `Sentry: Message captured`);
    return eventId;
  }

  setUser(user: { id: string; email?: string; organizationId?: string }): void {
    this.userContext = user;
  }

  addBreadcrumb(category: string, message: string, data?: unknown): void {
    this.breadcrumbs.push({ category, message, data, timestamp: new Date() });
    if (this.breadcrumbs.length > 100) this.breadcrumbs.shift();
  }

  shutdown(): void {
    this.logger.info('Sentry shut down');
    this.initialized = false;
  }
}

// ─── Grafana Dashboard Config ────────────────────────────────────────────────

export interface GrafanaDashboard {
  readonly uid: string;
  readonly title: string;
  readonly panels: readonly GrafanaPanel[];
  readonly refresh: string;
  readonly timeRange: { from: string; to: string };
}

export interface GrafanaPanel {
  readonly title: string;
  readonly type: 'graph' | 'stat' | 'table' | 'gauge' | 'heatmap';
  readonly query: string;
  readonly position: { x: number; y: number; w: number; h: number };
}

export function generateDashboardConfig(_metrics: IMetrics): GrafanaDashboard {
  return {
    uid: 'coder-enterprise',
    title: 'CODER Enterprise Dashboard',
    refresh: '30s',
    timeRange: { from: 'now-1h', to: 'now' },
    panels: [
      { title: 'Request Rate', type: 'graph', query: 'rate(coder_http_requests_total[5m])', position: { x: 0, y: 0, w: 12, h: 6 } },
      { title: 'Error Rate', type: 'graph', query: 'rate(coder_http_requests_total{status=~"5.."}[5m])', position: { x: 12, y: 0, w: 12, h: 6 } },
      { title: 'P95 Latency', type: 'stat', query: 'histogram_quantile(0.95, rate(coder_http_request_duration_ms_bucket[5m]))', position: { x: 0, y: 6, w: 8, h: 4 } },
      { title: 'Provider Requests', type: 'graph', query: 'rate(coder_provider_requests_total[5m])', position: { x: 8, y: 6, w: 16, h: 4 } },
      { title: 'Token Usage', type: 'graph', query: 'sum(rate(coder_provider_tokens_total[5m]))', position: { x: 0, y: 10, w: 12, h: 6 } },
      { title: 'Tool Executions', type: 'graph', query: 'rate(coder_tool_executions_total[5m])', position: { x: 12, y: 10, w: 12, h: 6 } },
      { title: 'Active Connections', type: 'gauge', query: 'coder_active_connections', position: { x: 0, y: 16, w: 8, h: 4 } },
      { title: 'Memory Usage', type: 'graph', query: 'process_resident_memory_bytes', position: { x: 8, y: 16, w: 16, h: 4 } },
    ],
  };
}

// ─── Health Check Aggregator ─────────────────────────────────────────────────

export interface HealthCheckResult {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly version: string;
  readonly uptime: number;
  readonly timestamp: string;
  readonly checks: Record<string, { status: string; latencyMs: number; message?: string }>;
  readonly metrics: {
    readonly totalRequests: number;
    readonly errorRate: number;
    readonly avgLatency: number;
    readonly activeStreams: number;
    readonly queueDepth: number;
  };
}

export function createHealthCheck(
  observability: IObservability,
  additionalChecks: Record<string, () => Promise<boolean>> = {},
): () => Promise<HealthCheckResult> {
  return async () => {
    const healthMetrics = observability.getHealthMetrics();
    const checks: Record<string, { status: string; latencyMs: number; message?: string }> = {};

    for (const [name, check] of Object.entries(additionalChecks)) {
      const start = performance.now();
      try {
        const ok = await check();
        checks[name] = { status: ok ? 'healthy' : 'unhealthy', latencyMs: performance.now() - start };
      } catch (error) {
        checks[name] = { status: 'unhealthy', latencyMs: performance.now() - start, message: error instanceof Error ? error.message : String(error) };
      }
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const someHealthy = Object.values(checks).some((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      version: '1.0.0',
      uptime: healthMetrics.uptime,
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        totalRequests: healthMetrics.requests,
        errorRate: healthMetrics.requests > 0 ? healthMetrics.errors / healthMetrics.requests : 0,
        avgLatency: healthMetrics.avgLatency,
        activeStreams: 0,
        queueDepth: 0,
      },
    };
  };
}
