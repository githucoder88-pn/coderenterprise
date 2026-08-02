/**
 * Orchestrator Types / Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { CreateGoalSchema, TaskSchema } from '../../../orchestrator/types.js';

describe('CreateGoalSchema', () => {
  it('should validate a valid goal', () => {
    const result = CreateGoalSchema.safeParse({
      title: 'Build REST API',
      description: 'Build a complete REST API with authentication and CRUD operations',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.executionMode).toBe('balanced');
      expect(result.data.workflowPattern).toBe('sequential');
      expect(result.data.maxIterations).toBe(20);
    }
  });

  it('should reject empty title', () => {
    const result = CreateGoalSchema.safeParse({ title: '', description: 'test' });
    expect(result.success).toBe(false);
  });

  it('should accept all execution modes', () => {
    for (const mode of ['safe', 'balanced', 'aggressive', 'autonomous']) {
      const result = CreateGoalSchema.safeParse({ title: 'Test', description: 'Test', executionMode: mode });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all workflow patterns', () => {
    for (const pattern of ['sequential', 'parallel', 'hierarchical', 'consensus', 'event-driven']) {
      const result = CreateGoalSchema.safeParse({ title: 'Test', description: 'Test', workflowPattern: pattern });
      expect(result.success).toBe(true);
    }
  });

  it('should reject maxIterations over 100', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Test', description: 'Test', maxIterations: 200 });
    expect(result.success).toBe(false);
  });
});

describe('TaskSchema', () => {
  it('should validate a task', () => {
    const result = TaskSchema.safeParse({ title: 'Implement auth', description: 'Add JWT auth' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(50);
      expect(result.data.dependencies).toEqual([]);
    }
  });
});
