/**
 * Agent Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRegistry, type AgentHandler } from '../../../orchestrator/registry/agent-registry.js';
import { createMockLogger } from '../../helpers.js';
import type { AgentRole, AgentContext, Task, AgentResult } from '../../../orchestrator/types.js';

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    workflowId: 'wf-1', goalId: 'goal-1', parentAgentId: null, childAgentIds: [],
    executionMode: 'balanced', maxIterations: 10, currentIteration: 0,
    workspaceId: null, conversationId: null, permissions: ['filesystem.read'],
    systemPrompt: 'Test agent', availableTools: [],
    ...overrides,
  };
}

function makeTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: 'task-1', goalId: 'goal-1', title: 'Test task', description: 'Do something',
    assignedAgentId: null, status: 'pending', priority: 50, dependencies: [],
    input: 'test input', output: null, artifacts: [], retries: 0, maxRetries: 3,
    error: null, metadata: {}, createdAt: now, updatedAt: now, ...overrides,
  };
}

function makeHandler(role: AgentRole = 'coder'): AgentHandler {
  return {
    role,
    execute: vi.fn(async (): Promise<AgentResult> => ({
      success: true, output: 'Done', artifacts: [],
      tokenUsage: { prompt: 100, completion: 50, total: 150 },
      durationMs: 100, iterations: 1,
    })),
    canHandle: vi.fn(() => true),
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => { registry = new AgentRegistry(createMockLogger()); });

  describe('registerHandler', () => {
    it('should register an agent handler', () => {
      registry.registerHandler(makeHandler('coder'));
      expect(registry.getHandler('coder')).not.toBeNull();
    });
  });

  describe('createAgent', () => {
    it('should create an agent with correct role', () => {
      const agent = registry.createAgent('coder', makeContext());
      expect(agent.role).toBe('coder');
      expect(agent.status).toBe('created');
      expect(agent.name).toBe('Coder Agent');
    });

    it('should create unique IDs', () => {
      const a1 = registry.createAgent('coder', makeContext());
      const a2 = registry.createAgent('coder', makeContext());
      expect(a1.id).not.toBe(a2.id);
    });
  });

  describe('updateStatus', () => {
    it('should update agent status', () => {
      const agent = registry.createAgent('coder', makeContext());
      const updated = registry.updateStatus(agent.id, 'running');
      expect(updated.status).toBe('running');
    });
  });

  describe('executeTask', () => {
    it('should execute a task with the correct handler', async () => {
      const handler = makeHandler('coder');
      registry.registerHandler(handler);
      const agent = registry.createAgent('coder', makeContext());
      const task = makeTask();

      const result = await registry.executeTask(agent.id, task);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Done');
      expect(handler.execute).toHaveBeenCalledOnce();
    });

    it('should update agent status on success', async () => {
      registry.registerHandler(makeHandler('coder'));
      const agent = registry.createAgent('coder', makeContext());
      await registry.executeTask(agent.id, makeTask());

      const updated = registry.getAgent(agent.id);
      expect(updated!.status).toBe('completed');
    });

    it('should update agent status on failure', async () => {
      const handler: AgentHandler = {
        role: 'coder',
        execute: vi.fn(async () => { throw new Error('Task failed'); }),
        canHandle: () => true,
      };
      registry.registerHandler(handler);
      const agent = registry.createAgent('coder', makeContext());

      await expect(registry.executeTask(agent.id, makeTask())).rejects.toThrow('Task failed');
      expect(registry.getAgent(agent.id)!.status).toBe('failed');
    });

    it('should fail for missing handler', async () => {
      const agent = registry.createAgent('coder', makeContext());
      await expect(registry.executeTask(agent.id, makeTask())).rejects.toThrow('No handler');
    });
  });

  describe('getAvailableAgents', () => {
    it('should return agents in available states', () => {
      const a1 = registry.createAgent('coder', makeContext());
      const a2 = registry.createAgent('reviewer', makeContext());
      registry.updateStatus(a2.id, 'running');

      const available = registry.getAvailableAgents();
      expect(available.length).toBe(1);
      expect(available[0]!.id).toBe(a1.id);
    });
  });

  describe('getAgentsByRole', () => {
    it('should filter by role', () => {
      registry.createAgent('coder', makeContext());
      registry.createAgent('coder', makeContext());
      registry.createAgent('reviewer', makeContext());

      expect(registry.getAgentsByRole('coder').length).toBe(2);
      expect(registry.getAgentsByRole('reviewer').length).toBe(1);
    });
  });
});
