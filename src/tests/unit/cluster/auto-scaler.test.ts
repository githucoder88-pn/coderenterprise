/**
 * Auto-Scaler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutoScaler } from '../../../cluster/scaling/auto-scaler.js';
import { createMockLogger } from '../../helpers.js';
import type { ClusterNode } from '../../../cluster/types.js';

function makeNode(id: string, cpu: number, memory: number): ClusterNode {
  return {
    id, hostname: `node-${id}`, ip: '10.0.0.1', port: 3000, status: 'healthy',
    role: 'worker', workers: [],
    cpu: { cores: 4, usage: cpu }, memory: { total: 8192, used: 4096, percent: memory },
    load: { m1: 1, m5: 1, m15: 1 }, lastHeartbeat: new Date(),
    metadata: {}, createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('AutoScaler', () => {
  let scaler: AutoScaler;

  beforeEach(() => { scaler = new AutoScaler(createMockLogger()); });

  describe('evaluate', () => {
    it('should scale up on high CPU', () => {
      const nodes = [makeNode('a', 90, 50)];
      const decision = scaler.evaluate(nodes, { chat: 0, workflow: 0, agent: 0, embedding: 0, search: 0, tool: 0, indexing: 0, telemetry: 0, notification: 0, billing: 0 });
      expect(decision).not.toBeNull();
      expect(decision!.desiredInstances).toBeGreaterThan(1);
    });

    it('should scale down on low CPU', () => {
      const nodes = [makeNode('a', 10, 30), makeNode('b', 15, 25)];
      // Need to clear default up policies or add specific down policy
      scaler.addPolicy({ metric: 'cpu', threshold: 20, direction: 'down', cooldownMs: 0, stepSize: 1, minInstances: 1, maxInstances: 100 });
      const decision = scaler.evaluate(nodes, { chat: 0, workflow: 0, agent: 0, embedding: 0, search: 0, tool: 0, indexing: 0, telemetry: 0, notification: 0, billing: 0 });
      expect(decision).not.toBeNull();
      expect(decision!.desiredInstances).toBeLessThan(2);
    });

    it('should scale up on high queue length', () => {
      const nodes = [makeNode('a', 50, 50)];
      const decision = scaler.evaluate(nodes, { chat: 2000, workflow: 0, agent: 0, embedding: 0, search: 0, tool: 0, indexing: 0, telemetry: 0, notification: 0, billing: 0 });
      expect(decision).not.toBeNull();
      expect(decision!.metric).toBe('queue_length');
    });

    it('should not scale when metrics are normal', () => {
      const nodes = [makeNode('a', 50, 50)];
      const decision = scaler.evaluate(nodes, { chat: 10, workflow: 0, agent: 0, embedding: 0, search: 0, tool: 0, indexing: 0, telemetry: 0, notification: 0, billing: 0 });
      expect(decision).toBeNull();
    });
  });

  describe('policies', () => {
    it('should add and remove policies', () => {
      scaler.addPolicy({ metric: 'latency', threshold: 5000, direction: 'up', cooldownMs: 30000, stepSize: 1, minInstances: 1, maxInstances: 50 });
      scaler.removePolicy('latency');
      // Policy removed, latency-based scaling should not trigger
    });
  });

  describe('metrics', () => {
    it('should record and retrieve metrics', () => {
      scaler.recordMetrics({ cpu: 80, memory: 70, queueLength: 100, latencyMs: 200, requestCount: 1000, timestamp: new Date() });
      scaler.recordMetrics({ cpu: 90, memory: 75, queueLength: 200, latencyMs: 300, requestCount: 1500, timestamp: new Date() });
      expect(scaler.getMetrics().length).toBe(2);
    });
  });

  describe('decisions', () => {
    it('should track decisions', () => {
      const nodes = [makeNode('a', 95, 80)];
      scaler.evaluate(nodes, { chat: 0, workflow: 0, agent: 0, embedding: 0, search: 0, tool: 0, indexing: 0, telemetry: 0, notification: 0, billing: 0 });
      expect(scaler.getDecisions().length).toBeGreaterThan(0);
    });
  });
});
