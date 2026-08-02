/**
 * Cluster Monitor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterMonitor } from '../../../cluster/monitoring/cluster-monitor.js';
import { MetricsCollector } from '../../../telemetry/metrics.js';
import { createMockLogger } from '../../helpers.js';
import type { ClusterNode } from '../../../cluster/types.js';

function makeNode(id: string, cpu = 50, memory = 50): ClusterNode {
  return {
    id, hostname: `node-${id}`, ip: '10.0.0.1', port: 3000, status: 'healthy',
    role: 'worker', workers: [],
    cpu: { cores: 4, usage: cpu }, memory: { total: 8192, used: 4096, percent: memory },
    load: { m1: 1, m5: 1, m15: 1 }, lastHeartbeat: new Date(),
    metadata: {}, createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('ClusterMonitor', () => {
  let monitor: ClusterMonitor;

  beforeEach(() => { monitor = new ClusterMonitor(createMockLogger(), new MetricsCollector()); });

  describe('registerNode', () => {
    it('should register a node', () => {
      monitor.registerNode(makeNode('a'));
      expect(monitor.getNodes().length).toBe(1);
    });
  });

  describe('heartbeat', () => {
    it('should update node metrics', () => {
      monitor.registerNode(makeNode('a', 50, 50));
      monitor.heartbeat('a', { cpu: 80, memory: 70, load: [2, 1.5, 1] });
      const node = monitor.getNode('a');
      expect(node!.cpu.usage).toBe(80);
      expect(node!.memory.percent).toBe(70);
    });

    it('should mark node unhealthy on high resource usage', () => {
      monitor.registerNode(makeNode('a'));
      monitor.heartbeat('a', { cpu: 98, memory: 97, load: [10, 8, 5] });
      expect(monitor.getNode('a')!.status).toBe('unhealthy');
    });

    it('should mark node degraded on moderate usage', () => {
      monitor.registerNode(makeNode('a'));
      monitor.heartbeat('a', { cpu: 85, memory: 60, load: [3, 2, 1] });
      expect(monitor.getNode('a')!.status).toBe('degraded');
    });
  });

  describe('getHealth', () => {
    it('should report healthy when all nodes healthy', () => {
      monitor.registerNode(makeNode('a'));
      monitor.registerNode(makeNode('b'));
      const health = monitor.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.totalNodes).toBe(2);
      expect(health.healthyNodes).toBe(2);
    });

    it('should report degraded when some nodes unhealthy', () => {
      monitor.registerNode(makeNode('a', 50, 50));
      monitor.registerNode(makeNode('b', 98, 98));
      monitor.heartbeat('b', { cpu: 98, memory: 98, load: [10, 8, 5] });
      const health = monitor.getHealth();
      expect(health.status).toBe('degraded');
    });

    it('should report critical when no healthy nodes', () => {
      monitor.registerNode(makeNode('a', 98, 98));
      monitor.heartbeat('a', { cpu: 98, memory: 98, load: [10, 8, 5] });
      const health = monitor.getHealth();
      expect(health.status).toBe('critical');
    });
  });

  describe('pruneStaleNodes', () => {
    it('should remove stale nodes', () => {
      monitor.registerNode(makeNode('a'));
      // Force stale by pruning with maxAge 0 and then re-registering with old heartbeat
      const node = monitor.getNode('a')!;
      // Re-register with old heartbeat by directly updating
      monitor.registerNode({ ...node, lastHeartbeat: new Date(Date.now() - 120000) });
      monitor.pruneStaleNodes(60000); // Prune nodes older than 60s
      expect(monitor.getNodes().length).toBe(0);
    });
  });
});
