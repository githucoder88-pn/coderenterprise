/**
 * Simulation Manager
 *
 * Orchestrates simulation execution across environments.
 */

import type {
  Simulation, SimulationConfig, SimulationStatus, SimulationResult,
  Environment, Scenario,
} from '../types.js';
import type { ScenarioManager } from '../scenarios/scenario-manager.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ISimulationManager {
  createSimulation(name: string, environment: Environment, scenarioIds: readonly string[], config: Partial<SimulationConfig>): Simulation;
  runSimulation(simulationId: string, executor: (scenario: Scenario) => Promise<{ output: string; durationMs: number; tokensUsed: number; cost: number }>): Promise<SimulationResult>;
  getSimulation(id: string): Simulation | null;
  listSimulations(status?: SimulationStatus): readonly Simulation[];
  pauseSimulation(id: string): void;
  resumeSimulation(id: string): void;
  cancelSimulation(id: string): void;
  getStats(): { total: number; byStatus: Record<string, number>; byEnvironment: Record<string, number> };
}

export class SimulationManager implements ISimulationManager {
  private readonly simulations = new Map<string, Simulation>();

  constructor(
    private readonly scenarioManager: ScenarioManager,
    private readonly logger: ILogger,
  ) {}

  createSimulation(name: string, environment: Environment, scenarioIds: readonly string[], config: Partial<SimulationConfig>): Simulation {
    const now = new Date();
    const fullConfig: SimulationConfig = {
      maxConcurrency: config.maxConcurrency ?? 5,
      timeout: config.timeout ?? 60_000,
      retries: config.retries ?? 2,
      deterministic: config.deterministic ?? true,
      seed: config.seed ?? 42,
      resourceLimits: config.resourceLimits ?? { maxTokens: 1_000_000, maxCost: 100, maxDurationMs: 600_000 },
      providers: config.providers ?? [],
      models: config.models ?? [],
    };

    const simulation: Simulation = {
      id: crypto.randomUUID(), name, description: '', environment,
      status: 'pending', scenarioIds, config: fullConfig,
      results: null, metadata: {}, createdAt: now, updatedAt: now,
    };

    this.simulations.set(simulation.id, simulation);
    this.logger.info({ id: simulation.id, name, environment, scenarios: scenarioIds.length }, 'Simulation created');
    return simulation;
  }

  async runSimulation(
    simulationId: string,
    executor: (scenario: Scenario) => Promise<{ output: string; durationMs: number; tokensUsed: number; cost: number }>,
  ): Promise<SimulationResult> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) throw new Error(`Simulation ${simulationId} not found`);

    this.simulations.set(simulationId, { ...simulation, status: 'running', updatedAt: new Date() });
    const start = performance.now();

    const scenarioResults: { scenarioId: string; success: boolean; score: number; durationMs: number }[] = [];
    let totalTokens = 0, totalCost = 0;

    for (const scenarioId of simulation.scenarioIds) {
      const scenario = this.scenarioManager.get(scenarioId);
      if (!scenario) continue;

      try {
        const result = await executor(scenario);
        scenarioResults.push({
          scenarioId, success: true,
          score: this.quickScore(result.output, scenario),
          durationMs: result.durationMs,
        });
        totalTokens += result.tokensUsed;
        totalCost += result.cost;
      } catch (error) {
        scenarioResults.push({ scenarioId, success: false, score: 0, durationMs: 0 });
      }
    }

    const completed = scenarioResults.filter((r) => r.success).length;
    const simResult: SimulationResult = {
      simulationId, totalScenarios: scenarioResults.length,
      completed, failed: scenarioResults.length - completed,
      averageScore: scenarioResults.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / Math.max(1, scenarioResults.length),
      totalDurationMs: performance.now() - start,
      totalTokens, totalCost, scenarioResults,
      scores: {}, completedAt: new Date(),
    };

    this.simulations.set(simulationId, { ...simulation, status: 'completed', results: simResult, updatedAt: new Date() });
    return simResult;
  }

  getSimulation(id: string): Simulation | null { return this.simulations.get(id) ?? null; }

  listSimulations(status?: SimulationStatus): readonly Simulation[] {
    const all = [...this.simulations.values()];
    return status ? all.filter((s) => s.status === status) : all;
  }

  pauseSimulation(id: string): void {
    const sim = this.simulations.get(id);
    if (sim) this.simulations.set(id, { ...sim, status: 'paused', updatedAt: new Date() });
  }

  resumeSimulation(id: string): void {
    const sim = this.simulations.get(id);
    if (sim) this.simulations.set(id, { ...sim, status: 'running', updatedAt: new Date() });
  }

  cancelSimulation(id: string): void {
    const sim = this.simulations.get(id);
    if (sim) this.simulations.set(id, { ...sim, status: 'cancelled', updatedAt: new Date() });
  }

  getStats(): { total: number; byStatus: Record<string, number>; byEnvironment: Record<string, number> } {
    const all = [...this.simulations.values()];
    const byStatus: Record<string, number> = {};
    const byEnvironment: Record<string, number> = {};
    for (const s of all) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      byEnvironment[s.environment] = (byEnvironment[s.environment] ?? 0) + 1;
    }
    return { total: all.length, byStatus, byEnvironment };
  }

  private quickScore(output: string, scenario: Scenario): number {
    if (!scenario.expectedOutput?.contains) return 0.5;
    const matched = scenario.expectedOutput.contains.filter((t) => output.includes(t)).length;
    return matched / scenario.expectedOutput.contains.length;
  }
}
