/**
 * Reasoning Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReasoningEngine } from '../../../intelligence/reasoning/reasoning-engine.js';
import { createMockLogger } from '../../helpers.js';
import type { IntelligenceGoal } from '../../../intelligence/types.js';

function makeGoal(description: string): IntelligenceGoal {
  return {
    id: 'goal-1', description, priority: 50, constraints: [],
    successCriteria: [], context: {}, status: 'pending',
    createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('ReasoningEngine', () => {
  let engine: ReasoningEngine;

  beforeEach(() => { engine = new ReasoningEngine(createMockLogger()); });

  describe('reason', () => {
    it('should reason sequentially', async () => {
      const result = await engine.reason(makeGoal('Build a REST API'));
      expect(result.strategy).toBe('sequential');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should select tree strategy for complex goals', async () => {
      const result = await engine.reason(makeGoal('Build a complex architecture system'));
      expect(result.steps.length).toBeGreaterThan(2);
    });

    it('should select consensus strategy', async () => {
      const result = await engine.reason(makeGoal('Compare approaches'), 'consensus');
      expect(result.strategy).toBe('consensus');
    });

    it('should track token usage', async () => {
      const result = await engine.reason(makeGoal('Test'));
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should track duration', async () => {
      const result = await engine.reason(makeGoal('Test'));
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });
  });

  describe('decompose', () => {
    it('should decompose build goals', async () => {
      const tasks = await engine.decompose('Build a REST API');
      expect(tasks.length).toBeGreaterThan(2);
      expect(tasks.some((t) => t.name.toLowerCase().includes('implement'))).toBe(true);
      expect(tasks.some((t) => t.name.toLowerCase().includes('test'))).toBe(true);
    });

    it('should decompose fix goals', async () => {
      const tasks = await engine.decompose('Fix the login error');
      expect(tasks.some((t) => t.name.toLowerCase().includes('diagnose'))).toBe(true);
      expect(tasks.some((t) => t.name.toLowerCase().includes('fix'))).toBe(true);
    });

    it('should decompose review goals', async () => {
      const tasks = await engine.decompose('Review the authentication code');
      expect(tasks.some((t) => t.name.toLowerCase().includes('review'))).toBe(true);
    });

    it('should always include validation', async () => {
      const tasks = await engine.decompose('Do something');
      expect(tasks.some((t) => t.name.toLowerCase().includes('validate'))).toBe(true);
    });
  });

  describe('infer', () => {
    it('should infer from premises', async () => {
      const result = await engine.infer(['All APIs need auth', 'This is an API']);
      expect(result.conclusion).toContain('2 premises');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('synthesize', () => {
    it('should synthesize multiple inputs', async () => {
      const result = await engine.synthesize([
        { source: 'analysis', content: 'Needs auth' },
        { source: 'design', content: 'Use JWT' },
      ]);
      expect(result).toContain('analysis');
      expect(result).toContain('JWT');
    });
  });
});
