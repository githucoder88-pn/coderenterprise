/**
 * Task Planner Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskPlanner } from '../../../orchestrator/planner/task-planner.js';
import { createMockLogger } from '../../helpers.js';
import type { Goal, Task } from '../../../orchestrator/types.js';

describe('TaskPlanner', () => {
  let planner: TaskPlanner;

  beforeEach(() => { planner = new TaskPlanner(createMockLogger()); });

  const makeGoal = (desc = 'Build a REST API'): Goal => ({
    id: 'goal-1', title: 'Build API', description: desc, status: 'planning',
    workflowPattern: 'sequential', executionMode: 'balanced', tasks: [],
    agents: [], checkpoints: [], result: null, metadata: {},
    createdAt: new Date(), updatedAt: new Date(),
  });

  describe('decompose', () => {
    it('should decompose a goal into tasks', async () => {
      const tasks = await planner.decompose(makeGoal());
      expect(tasks.length).toBeGreaterThanOrEqual(5);
      expect(tasks.some((t) => t.title.toLowerCase().includes('plan'))).toBe(true);
      expect(tasks.some((t) => t.title.toLowerCase().includes('implement'))).toBe(true);
      expect(tasks.some((t) => t.title.toLowerCase().includes('test'))).toBe(true);
      expect(tasks.some((t) => t.title.toLowerCase().includes('review'))).toBe(true);
    });

    it('should add research task for complex goals', async () => {
      const longDesc = 'A'.repeat(300);
      const tasks = await planner.decompose(makeGoal(longDesc));
      expect(tasks.some((t) => t.title.toLowerCase().includes('research'))).toBe(true);
    });

    it('should set up task dependencies', async () => {
      const tasks = await planner.decompose(makeGoal());
      const implTask = tasks.find((t) => t.title.toLowerCase().includes('implement'));
      expect(implTask?.dependencies.length).toBeGreaterThan(0);
    });

    it('should assign priorities', async () => {
      const tasks = await planner.decompose(makeGoal());
      expect(tasks.every((t) => t.priority > 0)).toBe(true);
      // Planning should have highest priority
      const planTask = tasks.find((t) => t.title.toLowerCase().includes('plan'));
      expect(planTask?.priority).toBe(100);
    });
  });

  describe('assignRoles', () => {
    it('should assign appropriate roles', async () => {
      const tasks = await planner.decompose(makeGoal());
      const assignments = planner.assignRoles(tasks);

      const planTask = tasks.find((t) => t.title.toLowerCase().includes('plan'));
      expect(assignments.get(planTask!.id)).toBe('planner');

      const testTask = tasks.find((t) => t.title.toLowerCase().includes('test'));
      expect(assignments.get(testTask!.id)).toBe('tester');
    });
  });

  describe('estimateComplexity', () => {
    it('should classify simple tasks as low', () => {
      expect(planner.estimateComplexity({ title: 'Simple rename', description: 'Rename file' } as any)).toBe('low');
    });

    it('should classify architecture tasks as high', () => {
      expect(planner.estimateComplexity({ title: 'Design architecture', description: 'Design the architecture' } as any)).toBe('high');
    });

    it('should classify default tasks as medium', () => {
      expect(planner.estimateComplexity({ title: 'Build feature', description: 'Implement feature' } as any)).toBe('medium');
    });
  });

  describe('resolveDependencies', () => {
    it('should produce correct execution levels', () => {
      const now = new Date();
      const tasks: Task[] = [
        { id: 'a', goalId: 'g', title: 'A', description: '', assignedAgentId: null, status: 'pending', priority: 50, dependencies: [], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 'b', goalId: 'g', title: 'B', description: '', assignedAgentId: null, status: 'pending', priority: 50, dependencies: ['a'], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 'c', goalId: 'g', title: 'C', description: '', assignedAgentId: null, status: 'pending', priority: 50, dependencies: ['a'], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
        { id: 'd', goalId: 'g', title: 'D', description: '', assignedAgentId: null, status: 'pending', priority: 50, dependencies: ['b', 'c'], input: '', output: null, artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {}, createdAt: now, updatedAt: now },
      ];

      const levels = planner.resolveDependencies(tasks);
      expect(levels.length).toBe(3);
      expect(levels[0]!.map((t) => t.id)).toContain('a');
      expect(levels[1]!.map((t) => t.id)).toContain('b');
      expect(levels[1]!.map((t) => t.id)).toContain('c');
      expect(levels[2]!.map((t) => t.id)).toContain('d');
    });
  });
});
