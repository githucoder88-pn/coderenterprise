/**
 * Scoring Manager
 *
 * Multi-dimensional scoring for simulation results.
 */

import type { ScoreCard, ScoreDimension, BenchmarkRun, Scenario } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IScoringManager {
  scoreRun(run: BenchmarkRun, scenario: Scenario): ScoreCard;
  scoreBatch(runs: readonly { run: BenchmarkRun; scenario: Scenario }[]): ScoreCard;
  compareScores(cardA: ScoreCard, cardB: ScoreCard): { winner: 'A' | 'B' | 'tie'; deltas: Record<string, number> };
  getGrade(score: number): ScoreCard['grade'];
  normalizeScores(scores: Record<string, number>): Record<string, number>;
}

export class ScoringManager implements IScoringManager {
  constructor(_logger: ILogger) {}

  scoreRun(run: BenchmarkRun, scenario: Scenario): ScoreCard {
    const dimensions: ScoreDimension[] = [
      { name: 'quality', score: this.scoreQuality(run, scenario), weight: 0.3, details: 'Output quality assessment' },
      { name: 'risk', score: run.success ? 0.9 : 0.1, weight: 0.15, details: run.success ? 'No risk detected' : 'Execution failed' },
      { name: 'confidence', score: run.success ? 0.85 : 0.2, weight: 0.15, details: 'Based on success and consistency' },
      { name: 'cost', score: this.scoreCost(run), weight: 0.15, details: `Cost: $${run.cost.toFixed(4)}` },
      { name: 'latency', score: this.scoreLatency(run), weight: 0.15, details: `Duration: ${run.durationMs.toFixed(0)}ms` },
      { name: 'performance', score: run.success ? 0.8 : 0.3, weight: 0.1, details: 'Overall performance' },
    ];

    const overall = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
    const recommendations: string[] = [];

    for (const dim of dimensions) {
      if (dim.score < 0.5) recommendations.push(`Improve ${dim.name}: current ${dim.score.toFixed(2)}`);
    }

    return { overall, dimensions, grade: this.getGrade(overall), recommendations };
  }

  scoreBatch(runs: readonly { run: BenchmarkRun; scenario: Scenario }[]): ScoreCard {
    const cards = runs.map(({ run, scenario }) => this.scoreRun(run, scenario));
    const avgOverall = cards.reduce((sum, c) => sum + c.overall, 0) / Math.max(1, cards.length);

    const dimensionMap = new Map<string, number[]>();
    for (const card of cards) {
      for (const dim of card.dimensions) {
        if (!dimensionMap.has(dim.name)) dimensionMap.set(dim.name, []);
        dimensionMap.get(dim.name)!.push(dim.score);
      }
    }

    const dimensions: ScoreDimension[] = [...dimensionMap.entries()].map(([name, scores]) => ({
      name,
      score: scores.reduce((s, v) => s + v, 0) / scores.length,
      weight: 1 / dimensionMap.size,
      details: `Average of ${scores.length} runs`,
    }));

    return { overall: avgOverall, dimensions, grade: this.getGrade(avgOverall), recommendations: [] };
  }

  compareScores(cardA: ScoreCard, cardB: ScoreCard): { winner: 'A' | 'B' | 'tie'; deltas: Record<string, number> } {
    const deltas: Record<string, number> = {};
    for (const dim of cardA.dimensions) {
      const bDim = cardB.dimensions.find((d) => d.name === dim.name);
      deltas[dim.name] = (bDim?.score ?? 0) - dim.score;
    }

    const delta = cardB.overall - cardA.overall;
    const winner = Math.abs(delta) < 0.01 ? 'tie' : delta > 0 ? 'B' : 'A';
    return { winner, deltas };
  }

  getGrade(score: number): ScoreCard['grade'] {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.6) return 'C';
    if (score >= 0.4) return 'D';
    return 'F';
  }

  normalizeScores(scores: Record<string, number>): Record<string, number> {
    const values = Object.values(scores);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(scores)) {
      normalized[key] = (value - min) / range;
    }
    return normalized;
  }

  private scoreQuality(run: BenchmarkRun, scenario: Scenario): number {
    if (!run.success) return 0.1;
    if (!scenario.expectedOutput?.contains) return 0.7;
    const matched = scenario.expectedOutput.contains.filter((t) => run.output.includes(t)).length;
    return matched / scenario.expectedOutput.contains.length;
  }

  private scoreCost(run: BenchmarkRun): number {
    if (run.cost <= 0.01) return 1;
    if (run.cost <= 0.1) return 0.8;
    if (run.cost <= 1) return 0.6;
    return 0.3;
  }

  private scoreLatency(run: BenchmarkRun): number {
    if (run.durationMs <= 1000) return 1;
    if (run.durationMs <= 5000) return 0.8;
    if (run.durationMs <= 15000) return 0.6;
    return 0.3;
  }
}
