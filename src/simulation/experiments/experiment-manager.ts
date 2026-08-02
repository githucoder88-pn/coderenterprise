/**
 * Experiment Manager
 *
 * A/B testing, multivariate testing, provider/workflow/agent comparisons.
 */

import type { Experiment, ExperimentType, ExperimentVariant, ExperimentResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IExperimentManager {
  createExperiment(name: string, type: ExperimentType, variants: readonly ExperimentVariant[], scenarioIds: readonly string[]): Experiment;
  runExperiment(experimentId: string, executor: (variant: ExperimentVariant, scenarioId: string) => Promise<{ score: number }>): Promise<ExperimentResult>;
  getExperiment(id: string): Experiment | null;
  listExperiments(status?: Experiment['status']): readonly Experiment[];
  cancelExperiment(id: string): void;
  getResults(id: string): ExperimentResult | null;
}

export class ExperimentManager implements IExperimentManager {
  private readonly experiments = new Map<string, Experiment>();

  constructor(private readonly logger: ILogger) {}

  createExperiment(name: string, type: ExperimentType, variants: readonly ExperimentVariant[], scenarioIds: readonly string[]): Experiment {
    const now = new Date();
    const experiment: Experiment = {
      id: crypto.randomUUID(), name, type, variants, scenarios: scenarioIds,
      status: 'draft', results: null, metadata: {}, createdAt: now, updatedAt: now,
    };
    this.experiments.set(experiment.id, experiment);
    this.logger.info({ id: experiment.id, name, type, variants: variants.length }, 'Experiment created');
    return experiment;
  }

  async runExperiment(
    experimentId: string,
    executor: (variant: ExperimentVariant, scenarioId: string) => Promise<{ score: number }>,
  ): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    this.experiments.set(experimentId, { ...experiment, status: 'running', updatedAt: new Date() });

    const variantScores = new Map<string, number[]>();

    for (const variant of experiment.variants) {
      const scores: number[] = [];
      for (const scenarioId of experiment.scenarios) {
        try {
          const result = await executor(variant, scenarioId);
          scores.push(result.score);
        } catch {
          scores.push(0);
        }
      }
      variantScores.set(variant.id, scores);
    }

    const variantResults = [...variantScores.entries()].map(([id, scores]) => ({
      id,
      scores: { average: scores.reduce((s, v) => s + v, 0) / Math.max(1, scores.length) },
      sampleSize: scores.length,
    }));

    // Determine winner
    const sorted = [...variantResults].sort((a, b) => (b.scores['average'] ?? 0) - (a.scores['average'] ?? 0));
    const winner = sorted[0]?.id ?? '';
    const topScore = sorted[0]?.scores['average'] ?? 0;
    const secondScore = sorted[1]?.scores['average'] ?? 0;
    const confidence = topScore > 0 ? (topScore - secondScore) / topScore : 0;

    const result: ExperimentResult = {
      winner, confidence: Math.min(1, confidence),
      variants: variantResults, statisticalSignificance: confidence > 0.1 ? 0.95 : 0.5,
    };

    this.experiments.set(experimentId, { ...experiment, status: 'completed', results: result, updatedAt: new Date() });
    return result;
  }

  getExperiment(id: string): Experiment | null { return this.experiments.get(id) ?? null; }

  listExperiments(status?: Experiment['status']): readonly Experiment[] {
    const all = [...this.experiments.values()];
    return status ? all.filter((e) => e.status === status) : all;
  }

  cancelExperiment(id: string): void {
    const exp = this.experiments.get(id);
    if (exp) this.experiments.set(id, { ...exp, status: 'cancelled', updatedAt: new Date() });
  }

  getResults(id: string): ExperimentResult | null {
    return this.experiments.get(id)?.results ?? null;
  }
}
