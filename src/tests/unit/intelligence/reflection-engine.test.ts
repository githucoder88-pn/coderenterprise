/**
 * Reflection Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReflectionEngine } from '../../../intelligence/reflection/reflection-engine.js';
import { createMockLogger } from '../../helpers.js';
import type { ReasoningResult, EvaluationResult } from '../../../intelligence/types.js';

describe('ReflectionEngine', () => {
  let engine: ReflectionEngine;

  beforeEach(() => { engine = new ReflectionEngine(createMockLogger()); });

  const makeReasoning = (overrides?: Partial<ReasoningResult>): ReasoningResult => ({
    goalId: 'goal-1', strategy: 'sequential', steps: [
      { id: 's1', type: 'analysis', input: 'test', output: 'analyzed', confidence: 0.8, durationMs: 100, tokensUsed: 50 },
    ],
    conclusion: 'Done', confidence: 0.8, totalTokens: 100, totalDurationMs: 500, ...overrides,
  });

  const makeEvaluation = (overall = 0.8): EvaluationResult => ({
    overall, scores: [
      { dimension: 'accuracy', score: overall, weight: 1, reasoning: 'test' },
    ],
    passed: overall >= 0.6, recommendations: [], timestamp: new Date(),
  });

  describe('reflectOnExecution', () => {
    it('should generate observations and lessons', () => {
      const entry = engine.reflectOnExecution('goal-1', makeReasoning(), makeEvaluation(0.9));
      expect(entry.observations.length).toBeGreaterThan(0);
      expect(entry.goalId).toBe('goal-1');
    });

    it('should suggest improvements for low confidence', () => {
      const entry = engine.reflectOnExecution('goal-1', makeReasoning({ confidence: 0.3 }), makeEvaluation(0.3));
      expect(entry.lessons.some((l) => l.includes('strategy'))).toBe(true);
      expect(entry.adjustments.length).toBeGreaterThan(0);
    });

    it('should praise excellent execution', () => {
      const entry = engine.reflectOnExecution('goal-1', makeReasoning(), makeEvaluation(0.9));
      expect(entry.observations.some((o) => o.includes('Excellent'))).toBe(true);
    });
  });

  describe('reflectOnFailure', () => {
    it('should analyze timeout failures', () => {
      const entry = engine.reflectOnFailure('goal-1', 'Request timeout', {});
      expect(entry.lessons.some((l) => l.includes('timeout'))).toBe(true);
    });

    it('should analyze token failures', () => {
      const entry = engine.reflectOnFailure('goal-1', 'Token budget exceeded', {});
      expect(entry.lessons.some((l) => l.toLowerCase().includes('token'))).toBe(true);
    });

    it('should always suggest checkpoints', () => {
      const entry = engine.reflectOnFailure('goal-1', 'Unknown error', {});
      expect(entry.lessons.some((l) => l.includes('checkpoint'))).toBe(true);
    });
  });

  describe('getLessons', () => {
    it('should aggregate lessons across reflections', () => {
      engine.reflectOnFailure('g1', 'timeout error', {});
      engine.reflectOnFailure('g2', 'timeout error', {});
      engine.reflectOnFailure('g3', 'token exceeded', {});

      const lessons = engine.getLessons();
      expect(lessons.length).toBeGreaterThan(0);
      const timeoutLesson = lessons.find((l) => l.lesson.includes('timeout'));
      expect(timeoutLesson?.frequency).toBe(2);
    });
  });

  describe('getReflections', () => {
    it('should retrieve reflections for a goal', () => {
      engine.reflectOnExecution('goal-1', makeReasoning(), makeEvaluation());
      engine.reflectOnFailure('goal-1', 'error', {});
      expect(engine.getReflections('goal-1').length).toBe(2);
    });
  });
});
