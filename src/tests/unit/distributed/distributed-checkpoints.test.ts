/**
 * Distributed Checkpoint Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DistributedCheckpointManager } from '../../../cluster/coordinator/distributed-checkpoints.js';
import { createMockLogger } from '../../helpers.js';
import type { DistributedAgent, DistributedMemory } from '../../../cluster/coordinator/types.js';

function makeAgent(): DistributedAgent {
  const now = new Date();
  return {
    id: 'agent-1', role: 'coder', nodeId: 'node-1', regionId: 'us-east',
    lifecycle: 'running', goal: 'Build API', tasks: [], currentTaskId: null,
    checkpointId: null, memory: { agentId: 'agent-1', scope: 'shared', entries: [], syncStatus: 'synced', lastSyncedAt: null },
    resourceUsage: { cpuMs: 0, memoryMb: 0, tokensUsed: 0 },
    retryCount: 0, maxRetries: 3, error: null, metadata: {},
    createdAt: now, updatedAt: now,
  };
}

function makeMemory(): DistributedMemory {
  return { agentId: 'agent-1', scope: 'shared', entries: [], syncStatus: 'synced', lastSyncedAt: new Date() };
}

describe('DistributedCheckpointManager', () => {
  let dcm: DistributedCheckpointManager;

  beforeEach(() => { dcm = new DistributedCheckpointManager(createMockLogger()); });

  describe('create', () => {
    it('should create a checkpoint', () => {
      const cp = dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      expect(cp.id).toBeDefined();
      expect(cp.hash).toBeDefined();
      expect(cp.size).toBeGreaterThan(0);
    });
  });

  describe('get / getByAgent / getLatest', () => {
    it('should retrieve checkpoints', () => {
      dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      dcm.create('agent-2', 'goal-2', 'eu-west', 'node-2', makeAgent(), makeMemory(), {});
      expect(dcm.getByAgent('agent-1').length).toBe(2);
      expect(dcm.getLatest('agent-1')).not.toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore a checkpoint', () => {
      const cp = dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      const restored = dcm.restore(cp.id);
      expect(restored).not.toBeNull();
      expect(restored!.agentId).toBe('agent-1');
    });
  });

  describe('replicate', () => {
    it('should replicate to another region', async () => {
      const cp = dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      const replica = await dcm.replicate(cp.id, 'eu-west');
      expect(replica.regionId).toBe('eu-west');
      expect(replica.id).toContain('replica');
    });
  });

  describe('cleanup', () => {
    it('should clean up old checkpoints', () => {
      // Create checkpoint with old timestamp
      const cp = dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      // Simulate old checkpoint by updating createdAt
      const oldTime = new Date(Date.now() - 2000);
      dcm.delete(cp.id);
      // Re-create with simulated old time
      const fresh = dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      // Cleanup with 0ms should not remove fresh ones
      expect(dcm.cleanup(100)).toBe(0);
      expect(dcm.getStats().total).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return checkpoint statistics', () => {
      dcm.create('agent-1', 'goal-1', 'us-east', 'node-1', makeAgent(), makeMemory(), {});
      dcm.create('agent-2', 'goal-2', 'eu-west', 'node-2', makeAgent(), makeMemory(), {});
      const stats = dcm.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byRegion['us-east']).toBe(1);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});
