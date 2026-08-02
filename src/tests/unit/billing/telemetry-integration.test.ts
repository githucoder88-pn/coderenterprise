/**
 * Telemetry Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SentryIntegration, OpenTelemetryIntegration, generateDashboardConfig, createHealthCheck } from '../../../telemetry/integrations.js';
import { ObservabilityService } from '../../../telemetry/observability.js';
import { MetricsCollector } from '../../../telemetry/metrics.js';
import { createMockLogger } from '../../helpers.js';

describe('OpenTelemetryIntegration', () => {
  it('should initialize', () => {
    const otel = new OpenTelemetryIntegration({
      serviceName: 'coder', serviceVersion: '1.0.0',
      endpoint: 'http://localhost:4318', sampleRate: 1.0,
      resourceAttributes: { 'service.env': 'test' },
    }, createMockLogger());

    otel.initialize();
    expect(otel.getConfig().serviceName).toBe('coder');
  });

  it('should shutdown', () => {
    const otel = new OpenTelemetryIntegration({
      serviceName: 'coder', serviceVersion: '1.0.0',
      endpoint: 'http://localhost:4318', sampleRate: 1.0, resourceAttributes: {},
    }, createMockLogger());

    otel.initialize();
    otel.shutdown();
  });
});

describe('SentryIntegration', () => {
  let sentry: SentryIntegration;

  beforeEach(() => {
    sentry = new SentryIntegration({
      dsn: 'https://test@sentry.io/123', environment: 'test',
      release: '1.0.0', sampleRate: 1.0, tracesSampleRate: 0.5,
    }, createMockLogger());
    sentry.initialize();
  });

  it('should capture exceptions', () => {
    const id = sentry.captureException(new Error('test'), { context: 'test' });
    expect(id).toBeDefined();
  });

  it('should capture messages', () => {
    const id = sentry.captureMessage('test message', 'warning', { extra: 'data' });
    expect(id).toBeDefined();
  });

  it('should set user context', () => {
    sentry.setUser({ id: 'u1', email: 'test@example.com' });
    // No assertion needed — just shouldn't throw
  });

  it('should add breadcrumbs', () => {
    sentry.addBreadcrumb('navigation', 'Visited /dashboard');
    sentry.addBreadcrumb('http', 'GET /api/users', { status: 200 });
  });
});

describe('Grafana Dashboard', () => {
  it('should generate dashboard config', () => {
    const metrics = new MetricsCollector();
    const config = generateDashboardConfig(metrics);

    expect(config.uid).toBe('coder-enterprise');
    expect(config.title).toBe('CODER Enterprise Dashboard');
    expect(config.panels.length).toBeGreaterThan(0);
    expect(config.panels.some((p) => p.title === 'Request Rate')).toBe(true);
    expect(config.panels.some((p) => p.title === 'Error Rate')).toBe(true);
    expect(config.panels.some((p) => p.title === 'Token Usage')).toBe(true);
  });
});

describe('Health Check', () => {
  it('should create and execute health check', async () => {
    const obs = new ObservabilityService(new MetricsCollector(), createMockLogger());
    const healthCheck = createHealthCheck(obs, {
      redis: async () => true,
      firestore: async () => true,
    });

    const result = await healthCheck();
    expect(result.status).toBe('healthy');
    expect(result.version).toBe('1.0.0');
    expect(result.checks['redis']?.status).toBe('healthy');
    expect(result.checks['firestore']?.status).toBe('healthy');
    expect(result.metrics).toBeDefined();
  });

  it('should report degraded when some checks fail', async () => {
    const obs = new ObservabilityService(new MetricsCollector(), createMockLogger());
    const healthCheck = createHealthCheck(obs, {
      redis: async () => true,
      database: async () => { throw new Error('Connection refused'); },
    });

    const result = await healthCheck();
    expect(result.status).toBe('degraded');
    expect(result.checks['redis']?.status).toBe('healthy');
    expect(result.checks['database']?.status).toBe('unhealthy');
  });
});
