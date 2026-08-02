/**
 * Benchmark Manager
 *
 * Manages benchmark suites, executes benchmarks, generates reports.
 */

import type {
  Benchmark, BenchmarkCategory, BenchmarkResult, BenchmarkRun, BenchmarkAggregate,
  BenchmarkComparison, Scenario,
} from '../types.js';
import type { ScenarioManager } from '../scenarios/scenario-manager.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IBenchmarkManager {
  createBenchmark(name: string, category: BenchmarkCategory, scenarioIds: readonly string[], metrics: readonly string[]): Benchmark;
  runBenchmark(benchmarkId: string, executor: (scenario: Scenario) => Promise<{ output: string; durationMs: number; tokensUsed: number; cost: number }>): Promise<BenchmarkResult>;
  getBenchmark(id: string): Benchmark | null;
  listBenchmarks(category?: BenchmarkCategory): readonly Benchmark[];
  compareResults(resultA: BenchmarkResult, resultB: BenchmarkResult): BenchmarkComparison;
  getLeaderboard(benchmarkId: string): readonly { provider: string; score: number; rank: number }[];
  setBaseline(benchmarkId: string, provider: string, model: string, scores: Record<string, number>): void;
}

export class BenchmarkManager implements IBenchmarkManager {
  private readonly benchmarks = new Map<string, Benchmark>();
  private readonly results = new Map<string, BenchmarkResult[]>();

  constructor(
    private readonly scenarioManager: ScenarioManager,
    private readonly logger: ILogger,
  ) {}

  createBenchmark(name: string, category: BenchmarkCategory, scenarioIds: readonly string[], metrics: readonly string[]): Benchmark {
    const now = new Date();
    const benchmark: Benchmark = {
      id: crypto.randomUUID(), name, category, description: '',
      scenarios: scenarioIds, metrics, baseline: null, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.benchmarks.set(benchmark.id, benchmark);
    this.logger.info({ id: benchmark.id, name, category, scenarios: scenarioIds.length }, 'Benchmark created');
    return benchmark;
  }

  async runBenchmark(
    benchmarkId: string,
    executor: (scenario: Scenario) => Promise<{ output: string; durationMs: number; tokensUsed: number; cost: number }>,
  ): Promise<BenchmarkResult> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) throw new Error(`Benchmark ${benchmarkId} not found`);

    const runs: BenchmarkRun[] = [];
    const start = performance.now();

    for (const scenarioId of benchmark.scenarios) {
      const scenario = this.scenarioManager.get(scenarioId);
      if (!scenario) continue;

      try {
        const result = await executor(scenario);
        const scores = this.scoreRun(result.output, scenario, benchmark.metrics);

        runs.push({
          scenarioId, provider: scenario.input.provider ?? 'default',
          model: scenario.input.model ?? 'default',
          output: result.output, scores,
          durationMs: result.durationMs,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          success: true, error: null,
        });
      } catch (error) {
        runs.push({
          scenarioId, provider: 'unknown', model: 'unknown',
          output: '', scores: {}, durationMs: 0, tokensUsed: 0, cost: 0,
          success: false, error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const aggregate = this.computeAggregate(runs, benchmark.metrics);
    const existingResults = this.results.get(benchmarkId) ?? [];

    // Compare with baseline if exists
    let comparison: BenchmarkComparison | null = null;
    if (benchmark.baseline && existingResults.length > 0) {
      comparison = this.compareResults(
        { benchmarkId, runs, aggregate, comparison: null },
        existingResults[0]!,
      );
    }

    const result: BenchmarkResult = { benchmarkId, runs, aggregate, comparison };
    this.results.set(benchmarkId, [result, ...existingResults.slice(0, 9)]);

    this.logger.info({
      benchmarkId, scenarios: runs.length,
      passed: aggregate.passed, avgScore: aggregate.averageScore,
      totalMs: performance.now() - start,
    }, 'Benchmark completed');

    return result;
  }

  getBenchmark(id: string): Benchmark | null { return this.benchmarks.get(id) ?? null; }

  listBenchmarks(category?: BenchmarkCategory): readonly Benchmark[] {
    const all = [...this.benchmarks.values()];
    return category ? all.filter((b) => b.category === category) : all;
  }

  compareResults(resultA: BenchmarkResult, resultB: BenchmarkResult): BenchmarkComparison {
    return {
      baseline: resultA.benchmarkId,
      current: resultB.benchmarkId,
      scoreDelta: resultB.aggregate.averageScore - resultA.aggregate.averageScore,
      latencyDelta: resultB.aggregate.medianLatencyMs - resultA.aggregate.medianLatencyMs,
      costDelta: resultB.aggregate.totalCost - resultA.aggregate.totalCost,
      improved: [],
      degraded: [],
    };
  }

  getLeaderboard(benchmarkId: string): readonly { provider: string; score: number; rank: number }[] {
    const results = this.results.get(benchmarkId) ?? [];
    const providerScores = new Map<string, number[]>();

    for (const result of results) {
      for (const run of result.runs) {
        if (!providerScores.has(run.provider)) providerScores.set(run.provider, []);
        const avgScore = Object.values(run.scores).reduce((s, v) => s + v, 0) / Math.max(1, Object.values(run.scores).length);
        providerScores.get(run.provider)!.push(avgScore);
      }
    }

    const leaderboard = [...providerScores.entries()].map(([provider, scores]) => ({
      provider,
      score: scores.reduce((s, v) => s + v, 0) / scores.length,
      rank: 0,
    })).sort((a, b) => b.score - a.score);

    leaderboard.forEach((entry, i) => { (entry as any).rank = i + 1; });
    return leaderboard;
  }

  setBaseline(benchmarkId: string, provider: string, model: string, scores: Record<string, number>): void {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) return;
    this.benchmarks.set(benchmarkId, {
      ...benchmark,
      baseline: { provider, model, scores, establishedAt: new Date() },
      updatedAt: new Date(),
    });
  }

  private scoreRun(output: string, scenario: Scenario, metrics: readonly string[]): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'accuracy':
          scores.accuracy = this.scoreAccuracy(output, scenario);
          break;
        case 'speed':
          scores.speed = 0.8; // Placeholder
          break;
        case 'cost':
          scores.cost = 0.9;
          break;
        case 'reliability':
          scores.reliability = 1.0;
          break;
        default:
          scores[metric] = 0.5;
      }
    }

    return scores;
  }

  private scoreAccuracy(output: string, scenario: Scenario): number {
    if (!scenario.expectedOutput) return 0.5;
    const expected = scenario.expectedOutput;

    if (expected.contains) {
      const allPresent = expected.contains.every((term) => output.includes(term));
      if (allPresent) return 1.0;
      const partial = expected.contains.filter((term) => output.includes(term)).length / expected.contains.length;
      return partial;
    }

    if (expected.minLength && output.length < expected.minLength) return 0.3;
    if (expected.maxLength && output.length > expected.maxLength) return 0.7;

    return 0.8;
  }

  private computeAggregate(runs: readonly BenchmarkRun[], metrics: readonly string[]): BenchmarkAggregate {
    const successful = runs.filter((r) => r.success);
    const allScores = successful.flatMap((r) => Object.values(r.scores));
    const latencies = successful.map((r) => r.durationMs).sort((a, b) => a - b);

    const byCategory: Record<string, { score: number; count: number }> = {};
    for (const metric of metrics) {
      const metricScores = successful.map((r) => r.scores[metric] ?? 0);
      byCategory[metric] = {
        score: metricScores.reduce((s, v) => s + v, 0) / Math.max(1, metricScores.length),
        count: metricScores.length,
      };
    }

    return {
      totalScenarios: runs.length,
      passed: successful.length,
      failed: runs.length - successful.length,
      averageScore: allScores.length > 0 ? allScores.reduce((s, v) => s + v, 0) / allScores.length : 0,
      medianLatencyMs: latencies[Math.floor(latencies.length / 2)] ?? 0,
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
      totalTokens: successful.reduce((s, r) => s + r.tokensUsed, 0),
      totalCost: successful.reduce((s, r) => s + r.cost, 0),
      byCategory,
    };
  }
}
