/**
 * Cluster Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterManager } from '../../../cluster/coordinator/cluster-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { DistributedNode, RegionId } from '../../../cluster/coordinator/types.js';

function makeNode(id: string, regionId: RegionId = 'us-east', cpu = 50, memory = 50): DistributedNode {
  return {
    id, regionId, hostname: `node-${id}`, ip: '10.0.0.1', port: 3000,
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

describe('ClusterManager', () => {
  let cm: ClusterManager;

  beforeEach(() => {
    cm = new ClusterManager(createMockLogger());
    cm.registerRegion({ id: 'us-east', name: 'US East', endpoint: '', status: 'active', nodes: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() });
  });

  describe('regions', () => {
    it('should register and retrieve regions', () => {
      cm.registerRegion({ id: 'us-east', name: 'US East', endpoint: 'https://us-east.coder.com', status: 'active', nodes: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() });
      expect(cm.getRegions().length).toBe(1);
      expect(cm.getRegion('us-east')!.name).toBe('US East');
    });
  });

  describe('nodes', () => {
    it('should register nodes', () => {
      cm.registerNode(makeNode('n1'));
      expect(cm.getNode('n1')).not.toBeNull();
    });

    it('should get nodes by region', () => {
      cm.registerNode(makeNode('n1', 'us-east'));
      cm.registerNode(makeNode('n2', 'eu-west'));
      cm.registerNode(makeNode('n3', 'us-east'));
      expect(cm.getNodesByRegion('us-east').length).toBe(2);
    });

    it('should get available nodes', () => {
      cm.registerNode(makeNode('n1', 'us-east'));
      cm.registerNode({ ...makeNode('n2', 'us-east'), lifecycle: 'terminated' });
      expect(cm.getAvailableNodes().length).toBe(1);
    });
  });

  describe('heartbeat', () => {
    it('should update node resources', () => {
      cm.registerNode(makeNode('n1'));
      cm.heartbeat('n1', {
        cpu: { cores: 4, usage: 80 }, memory: { total: 8192, used: 6000, percent: 75 },
        disk: { total: 100000, used: 0, percent: 0 }, network: { bandwidthMbps: 1000, latencyMs: 2 },
        activeAgents: 3, queuedTasks: 1,
      });
      const node = cm.getNode('n1');
      expect(node!.resources.cpu.usage).toBe(80);
      expect(node!.resources.activeAgents).toBe(3);
    });
  });

  describe('health', () => {
    it('should report healthy when all nodes healthy', () => {
      cm.registerNode(makeNode('n1'));
      cm.registerNode(makeNode('n2'));
      const health = cm.getHealth();
      expect(health.global).toBe('healthy');
      expect(health.totalNodes).toBe(2);
    });

    it('should report degraded when some nodes down', () => {
      cm.registerNode(makeNode('n1'));
      cm.registerNode({ ...makeNode('n2'), lifecycle: 'terminated' });
      const health = cm.getHealth();
      expect(health.global).toBe('degraded');
    });

    it('should report critical when all nodes down', () => {
      cm.registerNode({ ...makeNode('n1'), lifecycle: 'terminated' });
      const health = cm.getHealth();
      expect(health.global).toBe('critical');
    });
  });

  describe('pruneStaleNodes', () => {
    it('should remove stale nodes', () => {
      cm.registerNode(makeNode('n1'));
      cm.registerNode({ ...makeNode('n2'), lastHeartbeat: new Date(Date.now() - 120000) });
      const pruned = cm.pruneStaleNodes(60000);
      expect(pruned).toBe(1);
      expect(cm.getNode('n1')).not.toBeNull();
      expect(cm.getNode('n2')).toBeNull();
    });
  });
});
