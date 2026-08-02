/**
 * Execution Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionEngine } from '../../../orchestrator/execution/execution-engine.js';
import { AgentRegistry, type AgentHandler } from '../../../orchestrator/registry/agent-registry.js';
import { EventBus } from '../../../core/event-bus.js';
import { createMockLogger } from '../../helpers.js';
import type { Goal, Task, AgentResult } from '../../../orchestrator/types.js';

function makeHandler(): AgentHandler {
  return {
    role: 'coder',
    execute: vi.fn(async (): Promise<AgentResult> => ({
      success: true, output: 'Task completed', artifacts: [],
      tokenUsage: { prompt: 100, completion: 50, total: 150 },
      durationMs: 100, iterations: 1,
    })),
    canHandle: () => true,
  };
}

function makeGoal(overrides?: Partial<Goal>): Goal {
  const now = new Date();
  const task: Task = {
    id: 'task-1', goalId: 'goal-1', title: 'Implement feature', description: 'Build something',
    assignedAgentId: null, status: 'pending', priority: 50, dependencies: [],
    input: 'Build the feature', output: null, artifacts: [], retries: 0, maxRetries: 3,
    error: null, metadata: {}, createdAt: now, updatedAt: now,
  };
  return {
    id: 'goal-1', title: 'Test Goal', description: 'Build something amazing',
    status: 'executing', workflowPattern: 'sequential', executionMode: 'balanced',
    tasks: [task], agents: [], checkpoints: [], result: null, metadata: {},
    createdAt: now, updatedAt: now, ...overrides,
  };
}

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let registry: AgentRegistry;
  let eventBus: EventBus;

  beforeEach(() => {
    const logger = createMockLogger();
    registry = new AgentRegistry(logger);
    eventBus = new EventBus();
    engine = new ExecutionEngine(registry, eventBus, logger);
    registry.registerHandler(makeHandler());
  });

  describe('execute sequential', () => {
    it('should execute a single-task goal', async () => {
      const result = await engine.execute(makeGoal());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskStats.completed).toBe(1);
        expect(result.data.taskStats.total).toBe(1);
      }
    });

    it('should execute multi-task goals sequentially', async () => {
      const now = new Date();
      const tasks: Task[] = [
        { id: 't1', goalId: 'g1', title: 'Task 1', description: 'First', assignedAgentId: null, status: 'pending', priority: 90, dependencies: [], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 't2', goalId: 'g1', title: 'Task 2', description: 'Second', assignedAgentId: null, status: 'pending', priority: 50, dependencies: ['t1'], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
      ];

      const result = await engine.execute(makeGoal({ tasks }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.taskStats.total).toBe(2);
    });
  });

  describe('execute parallel', () => {
    it('should execute independent tasks in parallel', async () => {
      const now = new Date();
      const tasks: Task[] = [
        { id: 't1', goalId: 'g1', title: 'Task A', description: 'A', assignedAgentId: null, status: 'pending', priority: 50, dependencies: [], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 't2', goalId: 'g1', title: 'Task B', description: 'B', assignedAgentId: null, status: 'pending', priority: 50, dependencies: [], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
      ];

      const result = await engine.execute(makeGoal({ tasks, workflowPattern: 'parallel' }));
      expect(result.success).toBe(true);
    });

    it('should respect dependencies in parallel execution', async () => {
      const now = new Date();
      const tasks: Task[] = [
        { id: 't1', goalId: 'g1', title: 'First', description: 'First', assignedAgentId: null, status: 'pending', priority: 50, dependencies: [], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 't2', goalId: 'g1', title: 'Second', description: 'Depends on t1', assignedAgentId: null, status: 'pending', priority: 50, dependencies: ['t1'], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
      ];

      const result = await engine.execute(makeGoal({ tasks, workflowPattern: 'parallel' }));
      expect(result.success).toBe(true);
    });
  });

  describe('execute consensus', () => {
    it('should run multiple agents per task', async () => {
      registry.registerHandler({ ...makeHandler(), role: 'reviewer' });
      registry.registerHandler({ ...makeHandler(), role: 'architect' });

      const result = await engine.execute(makeGoal({ workflowPattern: 'consensus' }));
      expect(result.success).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should cancel execution', async () => {
      const goal = makeGoal();
      const execPromise = engine.execute(goal);
      await engine.cancel(goal.id);
      const result = await execPromise;
      expect(result).toBeDefined();
    });
  });
});
