/**
 * Coordination Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinationEngine } from '../../../intelligence/coordination/coordination-engine.js';
import { createMockLogger } from '../../helpers.js';

describe('CoordinationEngine', () => {
  let engine: CoordinationEngine;

  beforeEach(() => { engine = new CoordinationEngine(createMockLogger()); });

  const mockTask = async (_agentId: string, input: string) => `Processed: ${input}`;

  describe('coordinate sequential', () => {
    it('should execute agents sequentially', async () => {
      const result = await engine.coordinate(
        { goalId: 'g1', agents: ['a1', 'a2'], strategy: 'sequential', sharedMemory: false, timeout: 10000 },
        mockTask,
      );
      expect(result.agentResults.length).toBe(2);
      expect(result.agentResults[0]!.success).toBe(true);
    });
  });

  describe('coordinate parallel', () => {
    it('should execute agents in parallel', async () => {
      const result = await engine.coordinate(
        { goalId: 'g1', agents: ['a1', 'a2', 'a3'], strategy: 'parallel', sharedMemory: false, timeout: 10000 },
        mockTask,
      );
      expect(result.agentResults.length).toBe(3);
    });
  });

  describe('coordinate consensus', () => {
    it('should select best result', async () => {
      const result = await engine.coordinate(
        { goalId: 'g1', agents: ['a1', 'a2'], strategy: 'consensus', sharedMemory: false, timeout: 10000 },
        mockTask,
      );
      expect(result.consensus).toBeDefined();
    });
  });

  describe('allocateAgents', () => {
    it('should allocate agents with roles', () => {
      const agents = engine.allocateAgents(3, ['coder', 'reviewer', 'tester']);
      expect(agents.length).toBe(3);
      expect(agents[0]!.role).toBe('coder');
      expect(agents[1]!.role).toBe('reviewer');
    });
  });

  describe('releaseAgent', () => {
    it('should release an agent', () => {
      const agents = engine.allocateAgents(1, ['coder']);
      engine.releaseAgent(agents[0]!.id);
      expect(engine.getActiveAgents().length).toBe(0);
    });
  });
});
