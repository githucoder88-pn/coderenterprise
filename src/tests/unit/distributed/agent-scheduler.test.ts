/**
 * Agent Scheduler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterManager } from '../../../cluster/coordinator/cluster-manager.js';
import { NodeManager } from '../../../cluster/coordinator/node-manager.js';
import { AgentScheduler } from '../../../cluster/coordinator/agent-scheduler.js';
import { createMockLogger } from '../../helpers.js';
import type { DistributedNode } from '../../../cluster/coordinator/types.js';

function makeNode(id: string, regionId = 'us-east'): DistributedNode {
  return {
    id, regionId, hostname: `node-${id}`, ip: '10.0.0.1', port: 3000,
    lifecycle: 'available',
    capabilities: { maxConcurrentAgents: 10, supportedLanguages: ['typescript'], hasGpu: false, hasNetwork: true, hasTerminal: true },
    resources: {
      cpu: { cores: 4, usage: 20 }, memory: { total: 8192, used: 2048, percent: 25 },
      disk: { total: 100000, used: 0, percent: 0 }, network: { bandwidthMbps: 1000, latencyMs: 1 },
      activeAgents: 0, queuedTasks: 0,
    },
    lastHeartbeat: new Date(), metadata: {}, createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;
  let cluster: ClusterManager;
  let nodeManager: NodeManager;
  let node1Id: string;
  let node2Id: string;

  beforeEach(() => {
    const logger = createMockLogger();
    cluster = new ClusterManager(logger);
    nodeManager = new NodeManager(logger);
    scheduler = new AgentScheduler(cluster, nodeManager, logger);
    cluster.registerRegion({ id: 'us-east', name: 'US East', endpoint: '', status: 'active', nodes: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() });
    cluster.registerRegion({ id: 'eu-west', name: 'EU West', endpoint: '', status: 'active', nodes: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() });
    const node1 = nodeManager.createNode('us-east', 'node-1', '10.0.0.1', 3000);
    const node2 = nodeManager.createNode('eu-west', 'node-2', '10.0.0.2', 3000);
    node1Id = node1.id;
    node2Id = node2.id;
    cluster.registerNode({ ...node1, lifecycle: 'available' });
    cluster.registerNode({ ...node2, lifecycle: 'available' });
  });

  describe('scheduleAgent', () => {
    it('should schedule an agent on an available node', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      expect(agent.id).toBeDefined();
      expect(agent.lifecycle).toBe('queued');
      expect(agent.nodeId).not.toBeNull();
    });

    it('should prefer specified region', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } }, 'eu-west');
      expect(agent.regionId).toBe('eu-west');
    });

    it('should handle no available nodes', async () => {
      // Terminate all nodes
      for (const node of cluster.getAvailableNodes()) {
        cluster.updateNodeLifecycle(node.id, 'terminated');
      }
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      expect(agent.lifecycle).toBe('created');
      expect(agent.nodeId).toBeNull();
    });
  });

  describe('lifecycle', () => {
    it('should transition through running and completed', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      scheduler.startExecution(agent.id);
      expect(scheduler.getAgent(agent.id)!.lifecycle).toBe('running');

      scheduler.completeAgent(agent.id);
      expect(scheduler.getAgent(agent.id)!.lifecycle).toBe('completed');
    });

    it('should retry on failure', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      scheduler.failAgent(agent.id, 'Network error');
      const updated = scheduler.getAgent(agent.id);
      expect(updated!.lifecycle).toBe('queued');
      expect(updated!.retryCount).toBe(1);
    });

    it('should fail permanently after max retries', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 1, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      scheduler.failAgent(agent.id, 'error 1');
      scheduler.failAgent(agent.id, 'error 2');
      expect(scheduler.getAgent(agent.id)!.lifecycle).toBe('failed');
    });
  });

  describe('migration', () => {
    it('should migrate agent to another node', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      const targetNode = cluster.getNode(node2Id);
      expect(targetNode).not.toBeNull();
      const result = scheduler.migrateAgent(agent.id, node2Id);
      expect(result).toBe(true);
      expect(scheduler.getAgent(agent.id)!.nodeId).toBe(node2Id);
    });
  });

  describe('tasks', () => {
    it('should add tasks to an agent', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      const task = scheduler.addTask(agent.id, { goalId: 'goal-1', name: 'Implement auth', description: 'Add JWT auth', status: 'pending', priority: 80, input: 'Build JWT auth' });
      expect(task.agentId).toBe(agent.id);
      expect(scheduler.getAgent(agent.id)!.tasks.length).toBe(1);
    });
  });

  describe('checkpoint recovery', () => {
    it('should recover agent from checkpoint', async () => {
      const agent = await scheduler.scheduleAgent({ role: 'coder', goal: 'Build API', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      scheduler.failAgent(agent.id, 'crash');
      scheduler.failAgent(agent.id, 'crash');
      scheduler.failAgent(agent.id, 'crash');
      scheduler.failAgent(agent.id, 'crash'); // exceeds maxRetries

      const recovered = scheduler.recoverFromCheckpoint(agent.id, 'cp-1');
      expect(recovered).toBe(true);
      expect(scheduler.getAgent(agent.id)!.lifecycle).toBe('queued');
      expect(scheduler.getAgent(agent.id)!.checkpointId).toBe('cp-1');
    });
  });

  describe('stats', () => {
    it('should return agent statistics', async () => {
      await scheduler.scheduleAgent({ role: 'coder', goal: 'A', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      await scheduler.scheduleAgent({ role: 'reviewer', goal: 'B', maxRetries: 3, memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null } });
      const stats = scheduler.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byStatus['queued']).toBe(2);
    });
  });
});
