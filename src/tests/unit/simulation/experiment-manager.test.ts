/**
 * Experiment Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentManager } from '../../../simulation/experiments/experiment-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { ExperimentVariant } from '../../../simulation/types.js';

describe('ExperimentManager', () => {
  let manager: ExperimentManager;

  beforeEach(() => { manager = new ExperimentManager(createMockLogger()); });

  const variants: ExperimentVariant[] = [
    { id: 'v1', name: 'GPT-4o', config: {}, provider: 'openai', model: 'gpt-4o', weight: 1 },
    { id: 'v2', name: 'Claude', config: {}, provider: 'anthropic', model: 'claude-3', weight: 1 },
  ];

  describe('createExperiment', () => {
    it('should create an A/B experiment', () => {
      const exp = manager.createExperiment('Provider Test', 'a_b', variants, ['s1', 's2']);
      expect(exp.type).toBe('a_b');
      expect(exp.variants.length).toBe(2);
      expect(exp.status).toBe('draft');
    });
  });

  describe('runExperiment', () => {
    it('should run and determine winner', async () => {
      const exp = manager.createExperiment('Test', 'a_b', variants, ['s1']);

      const executor = async (variant: ExperimentVariant, _scenarioId: string) => {
        return { score: variant.id === 'v1' ? 0.9 : 0.7 };
      };

      const result = await manager.runExperiment(exp.id, executor);
      expect(result.winner).toBe('v1');
      expect(result.variants.length).toBe(2);
    });

    it('should track sample sizes', async () => {
      const exp = manager.createExperiment('Test', 'a_b', variants, ['s1', 's2', 's3']);

      const executor = async () => ({ score: 0.8 });
      const result = await manager.runExperiment(exp.id, executor);
      expect(result.variants[0]!.sampleSize).toBe(3);
    });
  });

  describe('getResults', () => {
    it('should return results after completion', async () => {
      const exp = manager.createExperiment('Test', 'a_b', variants, ['s1']);
      await manager.runExperiment(exp.id, async () => ({ score: 0.5 }));
      const results = manager.getResults(exp.id);
      expect(results).not.toBeNull();
    });
  });

  describe('cancelExperiment', () => {
    it('should cancel an experiment', () => {
      const exp = manager.createExperiment('Test', 'a_b', variants, ['s1']);
      manager.cancelExperiment(exp.id);
      expect(manager.getExperiment(exp.id)!.status).toBe('cancelled');
    });
  });
});
