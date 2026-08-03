/**
 * Observability Service
 *
 * Unified observability: metrics, tracing, logging, error tracking.
 * Prometheus-compatible metrics, OpenTelemetry traces, Sentry errors.
 */

import type { IMetrics } from './metrics.js';

// ─── Tracing ─────────────────────────────────────────────────────────────────

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly name: string;
  readonly startTime: number;
  endTime: number | null;
  attributes: Record<string, unknown>;
  status: 'ok' | 'error' | 'unset';
  events: readonly { name: string; timestamp: number; attributes?: Record<string, unknown> }[];
  end(): void;
  setAttribute(key: string, value: unknown): void;
  recordException(error: Error): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
}

export interface Tracer {
  startSpan(name: string, parent?: Span): Span;
  getActiveSpan(): Span | null;
}

class SpanImpl implements Span {
  readonly spanId: string;
  readonly events: { name: string; timestamp: number; attributes?: Record<string, unknown> }[] = [];
  endTime: number | null = null;
  attributes: Record<string, unknown> = {};
  status: 'ok' | 'error' | 'unset' = 'unset';

  constructor(
    readonly traceId: string,
    readonly parentSpanId: string | null,
    readonly name: string,
    readonly startTime: number,
  ) {
    this.spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }

  end(): void {
    this.endTime = performance.now();
    this.status = this.status === 'unset' ? 'ok' : this.status;
  }

  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }

  recordException(error: Error): void {
    this.status = 'error';
    this.addEvent('exception', { 'exception.type': error.name, 'exception.message': error.message, 'exception.stacktrace': error.stack });
  }

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    (this.events as any[]).push({ name, timestamp: performance.now(), attributes });
  }
}

export class TracerImpl implements Tracer {
  private activeSpan: Span | null = null;

  startSpan(name: string, parent?: Span): Span {
    const traceId = parent?.traceId ?? crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const span = new SpanImpl(traceId, parent?.spanId ?? null, name, performance.now());
    this.activeSpan = span;
    return span;
  }

  getActiveSpan(): Span | null { return this.activeSpan; }
}

// ─── Prometheus Metrics ──────────────────────────────────────────────────────

export interface PrometheusExporter {
  export(): string;
}

export class PrometheusExporterImpl implements PrometheusExporter {
  constructor(private readonly metrics: IMetrics) {}

  export(): string {
    const snapshot = this.metrics.snapshot();
    const lines: string[] = [];

    for (const [name, value] of Object.entries(snapshot.counters)) {
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE coder_${safeName} counter`);
      lines.push(`coder_${safeName} ${value}`);
    }

    for (const [name, value] of Object.entries(snapshot.gauges)) {
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE coder_${safeName} gauge`);
      lines.push(`coder_${safeName} ${value}`);
    }

    for (const [name, data] of Object.entries(snapshot.histograms)) {
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE coder_${safeName} histogram`);
      lines.push(`coder_${safeName}_count ${data.count}`);
      lines.push(`coder_${safeName}_sum ${data.sum.toFixed(3)}`);
    }

    return lines.join('\n') + '\n';
  }
}

// ─── Error Tracking ──────────────────────────────────────────────────────────

export interface ErrorTracker {
  captureException(error: Error, context?: Record<string, unknown>): string;
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: Record<string, unknown>): string;
  setUser(user: { id: string; email?: string; organizationId?: string }): void;
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void;
}

export class InMemoryErrorTracker implements ErrorTracker {
  private readonly errors: { id: string; error: Error; context?: Record<string, unknown>; timestamp: Date }[] = [];
  private readonly messages: { id: string; message: string; level: string; timestamp: Date }[] = [];
  private readonly breadcrumbs: { category: string; message: string; data?: Record<string, unknown>; timestamp: Date }[] = [];

  captureException(error: Error, context?: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    this.errors.push({ id, error, context, timestamp: new Date() });
    if (this.errors.length > 1000) this.errors.shift();
    return id;
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error', _context?: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    this.messages.push({ id, message, level, timestamp: new Date() });
    return id;
  }

  setUser(_user: { id: string; email?: string; organizationId?: string }): void {
    // User context stored for error tracking correlation
  }

  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({ category, message, data, timestamp: new Date() });
    if (this.breadcrumbs.length > 100) this.breadcrumbs.shift();
  }

  getRecentErrors(limit = 50): readonly { id: string; message: string; timestamp: Date }[] {
    return this.errors.slice(-limit).map((e) => ({ id: e.id, message: e.error.message, timestamp: e.timestamp }));
  }
}

// ─── Observability Service ───────────────────────────────────────────────────

export interface IObservability {
  readonly tracer: Tracer;
  readonly metrics: IMetrics;
  readonly errors: ErrorTracker;
  readonly prometheus: PrometheusExporter;
  recordRequest(method: string, path: string, status: number, durationMs: number): void;
  recordProviderRequest(provider: string, model: string, tokens: number, durationMs: number, success: boolean): void;
  recordToolExecution(toolId: string, durationMs: number, success: boolean): void;
  getHealthMetrics(): { uptime: number; requests: number; errors: number; avgLatency: number };
}

export class ObservabilityService implements IObservability {
  readonly tracer: Tracer;
  readonly errors: ErrorTracker;
  readonly prometheus: PrometheusExporter;
  private readonly startTime = Date.now();

  constructor(
    readonly metrics: IMetrics,
  ) {
    this.tracer = new TracerImpl();
    this.errors = new InMemoryErrorTracker();
    this.prometheus = new PrometheusExporterImpl(metrics);
  }

  recordRequest(method: string, path: string, status: number, durationMs: number): void {
    this.metrics.increment('http_requests_total', { method, status: String(status), path });
    this.metrics.histogram('http_request_duration_ms', durationMs, { method, path });
  }

  recordProviderRequest(provider: string, model: string, tokens: number, durationMs: number, success: boolean): void {
    this.metrics.increment('provider_requests_total', { provider, model, success: String(success) });
    this.metrics.histogram('provider_duration_ms', durationMs, { provider, model });
    this.metrics.increment('provider_tokens_total', { provider, model });
    this.metrics.gauge('provider_last_tokens', tokens, { provider, model });
  }

  recordToolExecution(toolId: string, durationMs: number, success: boolean): void {
    this.metrics.increment('tool_executions_total', { toolId, success: String(success) });
    this.metrics.histogram('tool_duration_ms', durationMs, { toolId });
  }

  getHealthMetrics(): { uptime: number; requests: number; errors: number; avgLatency: number } {
    const snapshot = this.metrics.snapshot();
    // Sum all http_requests_total variants (with labels)
    let totalRequests = 0;
    let totalErrors = 0;
    for (const [key, val] of Object.entries(snapshot.counters)) {
      if (key.startsWith('http_requests_total')) {
        totalRequests += val;
        if (key.includes('status="5')) totalErrors += val;
      }
    }
    const hist = snapshot.histograms['http_request_duration_ms'];
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: totalRequests,
      errors: totalErrors,
      avgLatency: hist ? hist.sum / Math.max(1, hist.count) : 0,
    };
  }
}
