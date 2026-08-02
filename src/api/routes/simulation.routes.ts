/**
 * Simulation Platform API Routes
 */

import { Hono } from 'hono';
import type { SimulationManager } from '../../simulation/environments/simulation-manager.js';
import type { ScenarioManager } from '../../simulation/scenarios/scenario-manager.js';
import type { BenchmarkManager } from '../../simulation/benchmarks/benchmark-manager.js';
import type { ExperimentManager } from '../../simulation/experiments/experiment-manager.js';
import type { ReplayManager } from '../../simulation/replay/replay-manager.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { CreateSimulationSchema, CreateScenarioSchema, CreateBenchmarkSchema } from '../../simulation/types.js';

export function createSimulationRouter(
  simulationManager: SimulationManager,
  scenarioManager: ScenarioManager,
  benchmarkManager: BenchmarkManager,
  experimentManager: ExperimentManager,
  replayManager: ReplayManager,
  logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Simulations ────────────────────────────────────────────────────────

  app.post('/simulations', async (c) => {
    const body = await c.req.json();
    const parsed = CreateSimulationSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const sim = simulationManager.createSimulation(parsed.data.name, parsed.data.environment, parsed.data.scenarioIds, parsed.data.config);
    return c.json({ success: true, data: sim }, 201);
  });

  app.get('/simulations', (c) => {
    return c.json({ success: true, data: simulationManager.listSimulations() });
  });

  app.get('/simulations/stats', (c) => {
    return c.json({ success: true, data: simulationManager.getStats() });
  });

  // ─── Scenarios ──────────────────────────────────────────────────────────

  app.post('/scenarios', async (c) => {
    const body = await c.req.json();
    const parsed = CreateScenarioSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const scenario = scenarioManager.create(parsed.data);
    return c.json({ success: true, data: scenario }, 201);
  });

  app.get('/scenarios', (c) => {
    const kind = c.req.query('kind');
    const category = c.req.query('category');
    return c.json({ success: true, data: scenarioManager.list({ kind: kind as any, category }) });
  });

  app.get('/scenarios/stats', (c) => {
    return c.json({ success: true, data: scenarioManager.getStats() });
  });

  // ─── Benchmarks ─────────────────────────────────────────────────────────

  app.post('/benchmarks', async (c) => {
    const body = await c.req.json();
    const parsed = CreateBenchmarkSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const benchmark = benchmarkManager.createBenchmark(parsed.data.name, parsed.data.category, parsed.data.scenarioIds, parsed.data.metrics);
    return c.json({ success: true, data: benchmark }, 201);
  });

  app.get('/benchmarks', (c) => {
    const category = c.req.query('category');
    return c.json({ success: true, data: benchmarkManager.listBenchmarks(category as any) });
  });

  app.get('/benchmarks/:id/leaderboard', (c) => {
    return c.json({ success: true, data: benchmarkManager.getLeaderboard(c.req.param('id')) });
  });

  // ─── Experiments ────────────────────────────────────────────────────────

  app.get('/experiments', (c) => {
    return c.json({ success: true, data: experimentManager.listExperiments() });
  });

  app.get('/experiments/:id/results', (c) => {
    const results = experimentManager.getResults(c.req.param('id'));
    return c.json({ success: true, data: results });
  });

  // ─── Replay ─────────────────────────────────────────────────────────────

  app.get('/replay/sessions', (c) => {
    const simId = c.req.query('simulationId');
    return c.json({ success: true, data: replayManager.listSessions(simId ?? undefined) });
  });

  return app;
}
