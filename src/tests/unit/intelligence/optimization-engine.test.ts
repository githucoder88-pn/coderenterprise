/**
 * Optimization Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizationEngine } from '../../../intelligence/optimization/optimization-engine.js';
import { createMockLogger } from '../../helpers.js';
import type { Plan } from '../../../intelligence/types.js';

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    id: 'plan-1', goalId: 'goal-1', strategy: 'sequential',
    steps: [
      { id: 's1', name: 'Analyze', description: 'Analyze', agentRole: 'planner', toolIds: [], dependencies: [], estimatedTokens: 1000, estimatedDurationMs: 3000, requiresApproval: false, riskLevel: 'low', fallback: null },
      { id: 's2', name: 'Build', description: 'Build', agentRole: 'coder', toolIds: ['fs.createFile'], dependencies: ['s1'], estimatedTokens: 10000, estimatedDurationMs: 30000, requiresApproval: true, riskLevel: 'medium', fallback: 'Retry' },
    ],
    estimatedTokens: 11000, estimatedDurationMs: 33000, estimatedCost: 0.055,
    riskScore: 30, confidence: 0.8, alternatives: [], ...overrides,
  };
}

describe('OptimizationEngine', () => {
  let engine: OptimizationEngine;

  beforeEach(() => { engine = new OptimizationEngine(createMockLogger()); });

  describe('optimize', () => {
    it('should optimize for speed', () => {
      const { result } = engine.optimize(makePlan(), 'speed');
      expect(result.objective).toBe('speed');
      expect(result.improvement).toBeGreaterThan(0);
    });

    it('should optimize for cost', () => {
      const { result } = engine.optimize(makePlan(), 'cost');
      expect(result.objective).toBe('cost');
    });

    it('should optimize for accuracy', () => {
      const { plan } = engine.optimize(makePlan(), 'accuracy');
      expect(plan.steps.some((s) => s.agentRole === 'reviewer')).toBe(true);
    });

    it('should optimize for stability', () => {
      const { plan } = engine.optimize(makePlan(), 'stability');
      expect(plan.steps.every((s) => s.fallback !== null)).toBe(true);
    });
  });

  describe('analyzeTradeoffs', () => {
    it('should analyze all dimensions', () => {
      const tradeoffs = engine.analyzeTradeoffs(makePlan());
      expect(Object.keys(tradeoffs)).toContain('speed');
      expect(Object.keys(tradeoffs)).toContain('cost');
      expect(Object.keys(tradeoffs)).toContain('accuracy');
      expect(Object.keys(tradeoffs)).toContain('stability');
    });
  });

  describe('suggestOptimizations', () => {
    it('should suggest optimizations', () => {
      const suggestions = engine.suggestOptimizations(makePlan());
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('calculateOptimalProvider', () => {
    it('should map steps to optimal providers', () => {
      const plan = makePlan();
      const mapping = engine.calculateOptimalProvider(plan.steps);
      expect(mapping['s1']).toBeDefined();
      expect(mapping['s2']).toBeDefined();
    });
  });
});
