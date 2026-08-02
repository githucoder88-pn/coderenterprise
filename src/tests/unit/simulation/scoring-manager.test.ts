/**
 * Scoring Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringManager } from '../../../simulation/scoring/scoring-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { BenchmarkRun, Scenario } from '../../../simulation/types.js';

describe('ScoringManager', () => {
  let manager: ScoringManager;

  beforeEach(() => { manager = new ScoringManager(createMockLogger()); });

  const makeRun = (overrides?: Partial<BenchmarkRun>): BenchmarkRun => ({
    scenarioId: 's1', provider: 'openai', model: 'gpt-4o',
    output: 'function hello() { return "world"; }',
    scores: { accuracy: 0.9, speed: 0.8 },
    durationMs: 2000, tokensUsed: 500, cost: 0.01,
    success: true, error: null, ...overrides,
  });

  const makeScenario = (overrides?: Partial<Scenario>): Scenario => ({
    id: 's1', name: 'Test', description: '', kind: 'unit', category: 'coding',
    input: { goal: 'Write a function', context: '', tools: [] },
    expectedOutput: { contains: ['function'] },
    assertions: [], tags: [], difficulty: 'medium', metadata: {},
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  });

  describe('scoreRun', () => {
    it('should score a successful run', () => {
      const card = manager.scoreRun(makeRun(), makeScenario());
      expect(card.overall).toBeGreaterThan(0.5);
      expect(card.grade).toBeDefined();
      expect(card.dimensions.length).toBeGreaterThan(0);
    });

    it('should score a failed run low', () => {
      const card = manager.scoreRun(makeRun({ success: false }), makeScenario());
      expect(card.overall).toBeLessThan(0.5);
    });

    it('should grade correctly', () => {
      expect(manager.getGrade(0.95)).toBe('A');
      expect(manager.getGrade(0.85)).toBe('B');
      expect(manager.getGrade(0.65)).toBe('C');
      expect(manager.getGrade(0.45)).toBe('D');
      expect(manager.getGrade(0.2)).toBe('F');
    });
  });

  describe('scoreBatch', () => {
    it('should score multiple runs', () => {
      const runs = [
        { run: makeRun(), scenario: makeScenario() },
        { run: makeRun({ success: false }), scenario: makeScenario() },
      ];
      const card = manager.scoreBatch(runs);
      expect(card.overall).toBeGreaterThan(0);
      expect(card.overall).toBeLessThan(1);
    });
  });

  describe('compareScores', () => {
    it('should compare two scorecards', () => {
      const a = manager.scoreRun(makeRun({ durationMs: 500 }), makeScenario());
      const b = manager.scoreRun(makeRun({ durationMs: 2000 }), makeScenario());
      const comparison = manager.compareScores(a, b);
      expect(['A', 'B', 'tie']).toContain(comparison.winner);
    });
  });

  describe('normalizeScores', () => {
    it('should normalize to 0-1', () => {
      const normalized = manager.normalizeScores({ a: 10, b: 20, c: 30 });
      expect(normalized.a).toBe(0);
      expect(normalized.c).toBe(1);
    });
  });
});
