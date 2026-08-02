/**
 * Checkpoint Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckpointManager } from '../../../orchestrator/checkpoints/checkpoint-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { Goal, AgentState, Task } from '../../../orchestrator/types.js';

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => { manager = new CheckpointManager(createMockLogger()); });

  const makeGoal = (): Goal => ({
    id: 'goal-1', title: 'Test', description: 'Test goal', status: 'executing',
    workflowPattern: 'sequential', executionMode: 'balanced', tasks: [],
    agents: [], checkpoints: [], result: null, metadata: {},
    createdAt: new Date(), updatedAt: new Date(),
  });

  describe('create', () => {
    it('should create a checkpoint', () => {
      const cp = manager.create('goal-1', 'v1', 'Initial', makeGoal(), [], []);
      expect(cp.id).toBeDefined();
      expect(cp.name).toBe('v1');
      expect(cp.goalId).toBe('goal-1');
      expect(cp.hash).toBeDefined();
    });

    it('should capture state snapshot', () => {
      const goal = makeGoal();
      const cp = manager.create('goal-1', 'v1', '', goal, [], []);
      expect(cp.state.goal.id).toBe('goal-1');
    });
  });

  describe('list', () => {
    it('should list checkpoints for a goal', () => {
      manager.create('goal-1', 'cp1', '', makeGoal(), [], []);
      manager.create('goal-1', 'cp2', '', makeGoal(), [], []);
      manager.create('goal-2', 'cp3', '', makeGoal(), [], []);

      expect(manager.list('goal-1').length).toBe(2);
      expect(manager.list('goal-2').length).toBe(1);
    });

    it('should sort by creation time (newest first)', () => {
      manager.create('goal-1', 'first', '', makeGoal(), [], []);
      manager.create('goal-1', 'second', '', makeGoal(), [], []);

      const list = manager.list('goal-1');
      expect(list[0]!.name).toBe('second');
    });
  });

  describe('restore', () => {
    it('should restore a checkpoint', () => {
      const cp = manager.create('goal-1', 'v1', '', makeGoal(), [], []);
      const restored = manager.restore(cp.id);
      expect(restored).not.toBeNull();
      expect(restored!.id).toBe(cp.id);
    });

    it('should return null for unknown checkpoint', () => {
      expect(manager.restore('unknown')).toBeNull();
    });
  });

  describe('getLatest', () => {
    it('should return the most recent checkpoint', () => {
      manager.create('goal-1', 'first', '', makeGoal(), [], []);
      manager.create('goal-1', 'second', '', makeGoal(), [], []);

      const latest = manager.getLatest('goal-1');
      expect(latest!.name).toBe('second');
    });
  });

  describe('compare', () => {
    it('should detect added tasks', () => {
      const task: Task = {
        id: 't1', goalId: 'goal-1', title: 'Task', description: '', assignedAgentId: null,
        status: 'pending', priority: 50, dependencies: [], input: '', output: null,
        artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {},
        createdAt: new Date(), updatedAt: new Date(),
      };

      const cp1 = manager.create('goal-1', 'v1', '', makeGoal(), [], []);
      const cp2 = manager.create('goal-1', 'v2', '', makeGoal(), [], [task]);

      const diff = manager.compare(cp1.id, cp2.id);
      expect(diff.added).toContain('t1');
    });

    it('should detect status changes', () => {
      const task1: Task = {
        id: 't1', goalId: 'goal-1', title: 'Task', description: '', assignedAgentId: null,
        status: 'pending', priority: 50, dependencies: [], input: '', output: null,
        artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {},
        createdAt: new Date(), updatedAt: new Date(),
      };
      const task2 = { ...task1, status: 'completed' as const, output: 'Done' };

      const cp1 = manager.create('goal-1', 'v1', '', makeGoal(), [], [task1]);
      const cp2 = manager.create('goal-1', 'v2', '', makeGoal(), [], [task2]);

      const diff = manager.compare(cp1.id, cp2.id);
      expect(diff.changed).toContain('t1');
    });
  });

  describe('delete', () => {
    it('should delete a checkpoint', () => {
      const cp = manager.create('goal-1', 'v1', '', makeGoal(), [], []);
      manager.delete(cp.id);
      expect(manager.get(cp.id)).toBeNull();
    });
  });
});
