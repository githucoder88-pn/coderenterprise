/**
 * Metrics Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../../telemetry/metrics.js';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  describe('counter', () => {
    it('should increment counter', () => {
      metrics.increment('requests');
      metrics.increment('requests');
      metrics.increment('requests');

      const snapshot = metrics.snapshot();
      expect(snapshot.counters['requests']).toBe(3);
    });

    it('should increment with labels', () => {
      metrics.increment('requests', { method: 'GET' });
      metrics.increment('requests', { method: 'POST' });

      const snapshot = metrics.snapshot();
      expect(snapshot.counters['requests{method="GET"}']).toBe(1);
      expect(snapshot.counters['requests{method="POST"}']).toBe(1);
    });
  });

  describe('gauge', () => {
    it('should set gauge value', () => {
      metrics.gauge('connections', 42);
      const snapshot = metrics.snapshot();
      expect(snapshot.gauges['connections']).toBe(42);
    });

    it('should overwrite gauge value', () => {
      metrics.gauge('connections', 42);
      metrics.gauge('connections', 10);
      const snapshot = metrics.snapshot();
      expect(snapshot.gauges['connections']).toBe(10);
    });
  });

  describe('histogram', () => {
    it('should record histogram values', () => {
      metrics.histogram('latency', 100);
      metrics.histogram('latency', 200);
      metrics.histogram('latency', 300);

      const snapshot = metrics.snapshot();
      expect(snapshot.histograms['latency']).toEqual({
        count: 3,
        sum: 600,
        min: 100,
        max: 300,
      });
    });
  });

  describe('timer', () => {
    it('should measure duration', async () => {
      const end = metrics.timer('operation');
      await new Promise((r) => setTimeout(r, 50));
      const duration = end();

      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(200);

      const snapshot = metrics.snapshot();
      expect(snapshot.histograms['operation']?.count).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.increment('requests');
      metrics.gauge('connections', 1);
      metrics.histogram('latency', 100);

      metrics.reset();

      const snapshot = metrics.snapshot();
      expect(snapshot.counters).toEqual({});
      expect(snapshot.gauges).toEqual({});
      expect(snapshot.histograms).toEqual({});
    });
  });
});
