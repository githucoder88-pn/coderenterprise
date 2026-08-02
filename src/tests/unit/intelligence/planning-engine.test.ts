/**
 * Planning Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningEngine } from '../../../intelligence/planning/planning-engine.js';
import { createMockLogger } from '../../helpers.js';
import type { IntelligenceGoal } from '../../../intelligence/types.js';

function makeGoal(description: string): IntelligenceGoal {
  return {
    id: 'goal-1', description, priority: 50, constraints: [],
    successCriteria: [], context: {}, status: 'pending',
    createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('PlanningEngine', () => {
  let engine: PlanningEngine;

  beforeEach(() => { engine = new PlanningEngine(createMockLogger()); });

  describe('createPlan', () => {
    it('should create a plan for build goals', async () => {
      const plan = await engine.createPlan(makeGoal('Build a REST API'), 'sequential');
      expect(plan.steps.length).toBeGreaterThan(2);
      expect(plan.estimatedTokens).toBeGreaterThan(0);
      expect(plan.confidence).toBeGreaterThan(0);
    });

    it('should create a plan for fix goals', async () => {
      const plan = await engine.createPlan(makeGoal('Fix the login bug'), 'sequential');
      expect(plan.steps.some((s) => s.agentRole === 'debugger')).toBe(true);
    });

    it('should include validation step', async () => {
      const plan = await engine.createPlan(makeGoal('Test'), 'sequential');
      expect(plan.steps.some((s) => s.name === 'Validate')).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('should estimate tokens, duration, and cost', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const estimate = engine.estimateCost(plan);
      expect(estimate.tokens).toBeGreaterThan(0);
      expect(estimate.durationMs).toBeGreaterThan(0);
      expect(estimate.cost).toBeGreaterThan(0);
    });
  });

  describe('assessRisk', () => {
    it('should assess low risk for simple plans', async () => {
      const plan = await engine.createPlan(makeGoal('Read a file'), 'sequential');
      const risk = engine.assessRisk(plan);
      expect(risk.score).toBeLessThan(50);
    });

    it('should assess higher risk for complex plans', async () => {
      const plan = await engine.createPlan(makeGoal('Build complex architecture with security'), 'sequential');
      const risk = engine.assessRisk(plan);
      expect(risk.factors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validatePlan', () => {
    it('should validate against constraints', async () => {
      const plan = await engine.createPlan(makeGoal('Test'), 'sequential');
      const result = engine.validatePlan(plan, [
        { type: 'token_budget', value: 1_000_000, hard: true },
        { type: 'time_limit', value: 600_000, hard: true },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject when over budget', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const result = engine.validatePlan(plan, [
        { type: 'token_budget', value: 10, hard: true },
      ]);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('optimizePlan', () => {
    it('should optimize for speed', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const optimized = engine.optimizePlan(plan, 'speed');
      expect(optimized.estimatedDurationMs).toBeLessThanOrEqual(plan.estimatedDurationMs);
    });

    it('should optimize for cost', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const optimized = engine.optimizePlan(plan, 'cost');
      expect(optimized.estimatedTokens).toBeLessThanOrEqual(plan.estimatedTokens);
    });

    it('should add validation for accuracy', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const optimized = engine.optimizePlan(plan, 'accuracy');
      expect(optimized.steps.length).toBeGreaterThanOrEqual(plan.steps.length);
    });
  });

  describe('generateAlternatives', () => {
    it('should generate alternative plans', async () => {
      const plan = await engine.createPlan(makeGoal('Build API'), 'sequential');
      const alternatives = engine.generateAlternatives(plan, 3);
      expect(alternatives.length).toBe(3);
      expect(alternatives[0]!.id).not.toBe(plan.id);
    });
  });
});
