/**
 * Scenario Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScenarioManager } from '../../../simulation/scenarios/scenario-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('ScenarioManager', () => {
  let manager: ScenarioManager;

  beforeEach(() => { manager = new ScenarioManager(createMockLogger()); });

  const makeScenario = (overrides?: Record<string, unknown>) => ({
    name: 'Test Scenario', description: 'A test', kind: 'unit' as const,
    category: 'coding', input: { goal: 'Write a function', context: '', tools: [] },
    expectedOutput: { contains: ['function'] },
    assertions: [{ type: 'no_error' as const, value: true, message: 'No errors' }],
    tags: ['test'], difficulty: 'medium' as const, metadata: {},
    ...overrides,
  });

  describe('create', () => {
    it('should create a scenario', () => {
      const scenario = manager.create(makeScenario());
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Test Scenario');
    });
  });

  describe('list', () => {
    it('should list all scenarios', () => {
      manager.create(makeScenario({ name: 'A' }));
      manager.create(makeScenario({ name: 'B', kind: 'integration' }));
      expect(manager.list().length).toBe(2);
    });

    it('should filter by kind', () => {
      manager.create(makeScenario({ kind: 'unit' }));
      manager.create(makeScenario({ name: 'B', kind: 'stress' }));
      expect(manager.list({ kind: 'unit' }).length).toBe(1);
    });
  });

  describe('search', () => {
    it('should search by name', () => {
      manager.create(makeScenario({ name: 'Auth Test', tags: ['auth'] }));
      manager.create(makeScenario({ name: 'DB Test', tags: ['database'] }));
      expect(manager.search('auth').length).toBe(1);
    });
  });

  describe('validate', () => {
    it('should validate valid scenario', () => {
      const scenario = manager.create(makeScenario());
      expect(manager.validate(scenario).valid).toBe(true);
    });
  });

  describe('generateVariants', () => {
    it('should generate variants', () => {
      const scenario = manager.create(makeScenario());
      const variants = manager.generateVariants(scenario, 3);
      expect(variants.length).toBe(3);
      expect(variants[0]!.id).not.toBe(scenario.id);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      manager.create(makeScenario({ kind: 'unit', difficulty: 'easy' }));
      manager.create(makeScenario({ name: 'B', kind: 'stress', difficulty: 'hard' }));
      const stats = manager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byKind['unit']).toBe(1);
    });
  });
});
