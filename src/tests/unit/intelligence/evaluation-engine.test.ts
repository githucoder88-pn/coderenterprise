/**
 * Evaluation Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EvaluationEngine } from '../../../intelligence/evaluation/evaluation-engine.js';
import { createMockLogger } from '../../helpers.js';

describe('EvaluationEngine', () => {
  let engine: EvaluationEngine;

  beforeEach(() => { engine = new EvaluationEngine(createMockLogger()); });

  describe('evaluateOutput', () => {
    it('should evaluate against criteria', () => {
      const result = engine.evaluateOutput('The API uses JWT authentication', ['authentication', 'JWT']);
      expect(result.passed).toBe(true);
      expect(result.overall).toBeGreaterThan(0.5);
    });

    it('should fail when criteria not met', () => {
      const result = engine.evaluateOutput('Hello world', ['authentication', 'encryption']);
      expect(result.scores.length).toBe(2);
    });
  });

  describe('scoreAccuracy', () => {
    it('should return 1 for exact match', () => {
      expect(engine.scoreAccuracy('hello', 'hello')).toBe(1);
    });

    it('should return partial score for similar strings', () => {
      const score = engine.scoreAccuracy('hello world', 'hello there');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('scoreConfidence', () => {
    it('should average confidences', () => {
      expect(engine.scoreConfidence([{ confidence: 0.8 }, { confidence: 0.6 }])).toBeCloseTo(0.7);
    });

    it('should return 0 for empty', () => {
      expect(engine.scoreConfidence([])).toBe(0);
    });
  });

  describe('scorePerformance', () => {
    it('should return 1 when under target', () => {
      expect(engine.scorePerformance(500, 1000)).toBe(1);
    });

    it('should decrease when over target', () => {
      expect(engine.scorePerformance(1500, 1000)).toBeLessThan(1);
    });
  });

  describe('scoreCost', () => {
    it('should return 1 when under budget', () => {
      expect(engine.scoreCost(5000, 10000)).toBe(1);
    });

    it('should decrease when over budget', () => {
      expect(engine.scoreCost(15000, 10000)).toBeLessThan(1);
    });
  });

  describe('scoreRisk', () => {
    it('should return high score for few factors', () => {
      expect(engine.scoreRisk([])).toBe(1);
      expect(engine.scoreRisk(['one'])).toBeCloseTo(0.85);
    });
  });
});
