/**
 * Simulation Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationManager } from '../../../simulation/environments/simulation-manager.js';
import { ScenarioManager } from '../../../simulation/scenarios/scenario-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('SimulationManager', () => {
  let simManager: SimulationManager;
  let scenarioManager: ScenarioManager;

  beforeEach(() => {
    const logger = createMockLogger();
    scenarioManager = new ScenarioManager(logger);
    simManager = new SimulationManager(scenarioManager, logger);
  });

  const createTestScenario = () => scenarioManager.create({
    name: 'Test Scenario', description: '', kind: 'unit', category: 'coding',
    input: { goal: 'Write hello world', context: '', tools: [] },
    expectedOutput: { contains: ['hello'] },
    assertions: [{ type: 'no_error', value: true, message: 'No errors' }],
    tags: [], difficulty: 'easy', metadata: {},
  });

  describe('createSimulation', () => {
    it('should create a simulation', () => {
      const scenario = createTestScenario();
      const sim = simManager.createSimulation('Test Sim', 'sandbox', [scenario.id], {});
      expect(sim.status).toBe('pending');
      expect(sim.environment).toBe('sandbox');
    });
  });

  describe('runSimulation', () => {
    it('should run scenarios and produce results', async () => {
      const scenario = createTestScenario();
      const sim = simManager.createSimulation('Test', 'sandbox', [scenario.id], {});
      const result = await simManager.runSimulation(sim.id, async () => ({
        output: 'hello world', durationMs: 100, tokensUsed: 50, cost: 0.001,
      }));
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.averageScore).toBeGreaterThan(0);
    });

    it('should handle failures gracefully', async () => {
      const scenario = createTestScenario();
      const sim = simManager.createSimulation('Test', 'sandbox', [scenario.id], {});
      const result = await simManager.runSimulation(sim.id, async () => {
        throw new Error('Provider down');
      });
      expect(result.failed).toBe(1);
    });
  });

  describe('pause / resume / cancel', () => {
    it('should manage simulation lifecycle', () => {
      const scenario = createTestScenario();
      const sim = simManager.createSimulation('Test', 'sandbox', [scenario.id], {});
      simManager.pauseSimulation(sim.id);
      expect(simManager.getSimulation(sim.id)!.status).toBe('paused');
      simManager.resumeSimulation(sim.id);
      expect(simManager.getSimulation(sim.id)!.status).toBe('running');
      simManager.cancelSimulation(sim.id);
      expect(simManager.getSimulation(sim.id)!.status).toBe('cancelled');
    });
  });

  describe('getStats', () => {
    it('should return simulation stats', () => {
      const scenario = createTestScenario();
      simManager.createSimulation('A', 'sandbox', [scenario.id], {});
      simManager.createSimulation('B', 'testing', [scenario.id], {});
      const stats = simManager.getStats();
      expect(stats.total).toBe(2);
    });
  });
});
