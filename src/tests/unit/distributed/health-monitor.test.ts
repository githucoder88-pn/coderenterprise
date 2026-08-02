/**
 * Health Monitor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterManager } from '../../../cluster/coordinator/cluster-manager.js';
import { NodeManager } from '../../../cluster/coordinator/node-manager.js';
import { AgentScheduler } from '../../../cluster/coordinator/agent-scheduler.js';
import { HealthMonitor } from '../../../cluster/coordinator/health-monitor.js';
import { createMockLogger } from '../../helpers.js';
import type { DistributedNode } from '../../../cluster/coordinator/types.js';

function makeNode(id: string, regionId = 'us-east', cpu = 50, memory = 50): DistributedNode {
  return {
    id, regionId, hostname: `n-${id}`, ip: '10.0.0.1', port: 3000,
    lifecycle: 'available',
    capabilities: { maxConcurrentAgents: 10, supportedLanguages: ['typescript'], hasGpu: false, hasNetwork: true, hasTerminal: true },
    resources: {
      cpu: { cores: 4, usage: cpu }, memory: { total: 8192, used: 4096, percent: memory },
      disk: { total: 100000, used: 0, percent: 0 }, network: { bandwidthMbps: 1000, latencyMs: 1 },
      activeAgents: 0, queuedTasks: 0,
    },
    lastHeartbeat: new Date(), metadata: {}, createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;
  let cluster: ClusterManager;

  beforeEach(() => {
    const logger = createMockLogger();
    cluster = new ClusterManager(logger);
    const nodeManager = new NodeManager(logger);
    const scheduler = new AgentScheduler(cluster, nodeManager, logger);
    monitor = new HealthMonitor(cluster, scheduler, logger);
    cluster.registerRegion({ id: 'us-east', name: 'US East', endpoint: '', status: 'active', nodes: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() });
    cluster.registerNode(makeNode('n1', 'us-east'));
    cluster.registerNode(makeNode('n2', 'us-east'));
  });

  describe('getClusterHealth', () => {
    it('should report cluster health', () => {
      const health = monitor.getClusterHealth();
      expect(health.global).toBe('healthy');
      expect(health.totalNodes).toBe(2);
    });
  });

  describe('getRegionHealth', () => {
    it('should report region health', () => {
      const health = monitor.getRegionHealth('us-east');
      expect(health.status).toBe('healthy');
      expect(health.nodes).toBe(2);
    });
  });

  describe('checkNodeHealth', () => {
    it('should report healthy node', () => {
      const health = monitor.checkNodeHealth('n1');
      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    it('should detect high CPU', () => {
      cluster.registerNode(makeNode('n3', 'us-east', 98, 50));
      const health = monitor.checkNodeHealth('n3');
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('CPU critically high');
    });
  });

  describe('metrics', () => {
    it('should record and retrieve metrics', () => {
      monitor.recordMetric('requests_total', 1000, { region: 'us-east' });
      monitor.recordMetric('latency_ms', 42);
      const metrics = monitor.getMetrics();
      expect(metrics['latency_ms']).toBe(42);
    });
  });
});
