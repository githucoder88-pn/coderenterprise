/**
 * Intelligence Layer API Routes
 */

import { Hono } from 'hono';
import type { ReasoningEngine } from '../../intelligence/reasoning/reasoning-engine.js';
import type { PlanningEngine } from '../../intelligence/planning/planning-engine.js';
import type { EvaluationEngine } from '../../intelligence/evaluation/evaluation-engine.js';
import type { ReflectionEngine } from '../../intelligence/reflection/reflection-engine.js';
import type { OptimizationEngine } from '../../intelligence/optimization/optimization-engine.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { ReasoningRequestSchema } from '../../intelligence/types.js';

export function createIntelligenceRouter(
  reasoning: ReasoningEngine,
  planning: PlanningEngine,
  evaluation: EvaluationEngine,
  reflection: ReflectionEngine,
  _optimization: OptimizationEngine,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Reasoning ──────────────────────────────────────────────────────────

  app.post('/reason', async (c) => {
    const body = await c.req.json();
    const parsed = ReasoningRequestSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });

    const goal = {
      id: crypto.randomUUID(), description: parsed.data.goal, priority: 50,
      constraints: parsed.data.constraints, successCriteria: [], context: parsed.data.context ?? {},
      status: 'pending' as const, createdAt: new Date(), updatedAt: new Date(),
    };

    const result = await reasoning.reason(goal, parsed.data.strategy);
    return c.json({ success: true, data: result });
  });

  app.post('/analyze', async (c) => {
    const body = await c.req.json();
    const result = await reasoning.analyze(body.goal, body.context);
    return c.json({ success: true, data: { analysis: result } });
  });

  app.post('/decompose', async (c) => {
    const body = await c.req.json();
    const result = await reasoning.decompose(body.goal);
    return c.json({ success: true, data: result });
  });

  app.get('/strategies', (c) => {
    return c.json({ success: true, data: reasoning.getStrategies() });
  });

  // ─── Planning ───────────────────────────────────────────────────────────

  app.post('/plan', async (c) => {
    const body = await c.req.json();
    const goal = {
      id: crypto.randomUUID(), description: body.goal, priority: 50,
      constraints: body.constraints ?? [], successCriteria: [], context: {},
      status: 'pending' as const, createdAt: new Date(), updatedAt: new Date(),
    };
    const plan = await planning.createPlan(goal, body.strategy ?? 'sequential');
    return c.json({ success: true, data: plan });
  });

  app.post('/plan/optimize', async (c) => {
    
    // In production: pass actual plan
    return c.json({ success: true, data: { message: 'Plan optimization requires a plan object' } });
  });

  // ─── Evaluation ─────────────────────────────────────────────────────────

  app.post('/evaluate', async (c) => {
    const body = await c.req.json();
    const result = evaluation.evaluateOutput(body.output ?? '', body.criteria ?? []);
    return c.json({ success: true, data: result });
  });

  // ─── Reflection ─────────────────────────────────────────────────────────

  app.get('/reflections/:goalId', (c) => {
    const reflections = reflection.getReflections(c.req.param('goalId'));
    return c.json({ success: true, data: reflections });
  });

  app.get('/lessons', (c) => {
    const limit = Number(c.req.query('limit') ?? 50);
    return c.json({ success: true, data: reflection.getLessons(limit) });
  });

  // ─── Optimization ───────────────────────────────────────────────────────

  app.get('/optimization/suggestions', (c) => {
    return c.json({ success: true, data: { suggestions: ['Compress context', 'Parallelize steps', 'Add fallbacks'] } });
  });

  return app;
}
