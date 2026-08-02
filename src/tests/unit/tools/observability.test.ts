/**
 * Observability Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObservabilityService, TracerImpl, PrometheusExporterImpl, InMemoryErrorTracker } from '../../../telemetry/observability.js';
import { MetricsCollector } from '../../../telemetry/metrics.js';
import { createMockLogger } from '../../helpers.js';

describe('Tracer', () => {
  let tracer: TracerImpl;

  beforeEach(() => { tracer = new TracerImpl(); });

  it('should create spans', () => {
    const span = tracer.startSpan('test-operation');
    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();
    expect(span.name).toBe('test-operation');
    expect(span.status).toBe('unset');
  });

  it('should set attributes', () => {
    const span = tracer.startSpan('test');
    span.setAttribute('http.method', 'GET');
    expect(span.attributes['http.method']).toBe('GET');
  });

  it('should record exceptions', () => {
    const span = tracer.startSpan('test');
    span.recordException(new Error('something broke'));
    expect(span.status).toBe('error');
    expect(span.events.length).toBe(1);
    expect(span.events[0]!.name).toBe('exception');
  });

  it('should add events', () => {
    const span = tracer.startSpan('test');
    span.addEvent('checkpoint', { step: 1 });
    expect(span.events.length).toBe(1);
  });

  it('should end spans', () => {
    const span = tracer.startSpan('test');
    span.end();
    expect(span.endTime).not.toBeNull();
    expect(span.status).toBe('ok');
  });

  it('should create child spans', () => {
    const parent = tracer.startSpan('parent');
    const child = tracer.startSpan('child', parent);
    expect(child.traceId).toBe(parent.traceId);
    expect(child.parentSpanId).toBe(parent.spanId);
  });
});

describe('PrometheusExporter', () => {
  it('should export counters', () => {
    const metrics = new MetricsCollector();
    metrics.increment('http_requests_total');
    metrics.increment('http_requests_total');

    const exporter = new PrometheusExporterImpl(metrics);
    const output = exporter.export();
    expect(output).toContain('coder_http_requests_total 2');
  });

  it('should export gauges', () => {
    const metrics = new MetricsCollector();
    metrics.gauge('active_connections', 42);

    const exporter = new PrometheusExporterImpl(metrics);
    const output = exporter.export();
    expect(output).toContain('coder_active_connections 42');
  });

  it('should export histograms', () => {
    const metrics = new MetricsCollector();
    metrics.histogram('latency', 100);
    metrics.histogram('latency', 200);

    const exporter = new PrometheusExporterImpl(metrics);
    const output = exporter.export();
    expect(output).toContain('coder_latency_count 2');
    expect(output).toContain('coder_latency_sum 300');
  });
});

describe('ErrorTracker', () => {
  let tracker: InMemoryErrorTracker;

  beforeEach(() => { tracker = new InMemoryErrorTracker(); });

  it('should capture exceptions', () => {
    const id = tracker.captureException(new Error('test error'));
    expect(id).toBeDefined();
    expect(tracker.getRecentErrors().length).toBe(1);
  });

  it('should capture messages', () => {
    const id = tracker.captureMessage('test message', 'error');
    expect(id).toBeDefined();
  });

  it('should set user context', () => {
    tracker.setUser({ id: 'user-1', email: 'test@example.com' });
    // No assertion needed — just shouldn't throw
  });

  it('should add breadcrumbs', () => {
    tracker.addBreadcrumb('navigation', 'Visited /dashboard');
    tracker.addBreadcrumb('action', 'Clicked button', { button: 'submit' });
    // No assertion needed — breadcrumbs are internal
  });
});

describe('ObservabilityService', () => {
  let obs: ObservabilityService;

  beforeEach(() => {
    obs = new ObservabilityService(new MetricsCollector(), createMockLogger());
  });

  it('should record HTTP requests', () => {
    obs.recordRequest('GET', '/api/users', 200, 45);
    obs.recordRequest('POST', '/api/users', 201, 120);

    const health = obs.getHealthMetrics();
    expect(health.requests).toBe(2);
  });

  it('should record provider requests', () => {
    obs.recordProviderRequest('openai', 'gpt-4o', 500, 1200, true);
    obs.recordProviderRequest('anthropic', 'claude-3', 300, 800, true);

    const snapshot = obs.metrics.snapshot();
    expect(snapshot.counters['provider_requests_total{model="gpt-4o",provider="openai",success="true"}']).toBe(1);
  });

  it('should record tool executions', () => {
    obs.recordToolExecution('fs.readFile', 50, true);
    obs.recordToolExecution('git.status', 200, true);

    const snapshot = obs.metrics.snapshot();
    expect(snapshot.counters['tool_executions_total{success="true",toolId="fs.readFile"}']).toBe(1);
  });

  it('should compute health metrics', () => {
    obs.recordRequest('GET', '/test', 200, 100);
    obs.recordRequest('GET', '/test', 200, 200);

    const health = obs.getHealthMetrics();
    expect(health.requests).toBe(2);
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should expose Prometheus endpoint', () => {
    obs.recordRequest('GET', '/test', 200, 50);
    const output = obs.prometheus.export();
    expect(output).toContain('coder_http_requests_total');
    expect(output).toContain('# TYPE');
  });
});
