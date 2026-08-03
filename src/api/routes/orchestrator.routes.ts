/**
 * Orchestrator API Routes
 */

import { Hono } from 'hono';
import type { AgentRegistry } from '../../orchestrator/registry/agent-registry.js';
import type { ExecutionEngine } from '../../orchestrator/execution/execution-engine.js';
import type { CheckpointManager } from '../../orchestrator/checkpoints/checkpoint-manager.js';
import type { TaskPlanner } from '../../orchestrator/planner/task-planner.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { CreateGoalSchema } from '../../orchestrator/types.js';

export function createOrchestratorRouter(
  agentRegistry: AgentRegistry,
  executionEngine: ExecutionEngine,
  checkpointManager: CheckpointManager,
  planner: TaskPlanner,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Goals ───────────────────────────────────────────────────────────────

  app.post('/goals', async (c) => {
    const body = await c.req.json();
    const parsed = CreateGoalSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });

    const goalId = `goal-${Date.now()}`;
    const now = new Date();
    const goal = {
      id: goalId, title: parsed.data.title, description: parsed.data.description,
      status: 'planning' as const, workflowPattern: parsed.data.workflowPattern,
      executionMode: parsed.data.executionMode, tasks: [], agents: [], checkpoints: [],
      result: null, metadata: { workspaceId: parsed.data.workspaceId, conversationId: parsed.data.conversationId }, maxIterations: 10,
      createdAt: now, updatedAt: now,
    };

    // Decompose into tasks
    const tasks = await planner.decompose(goal);
    const goalWithTasks = { ...goal, tasks, status: 'executing' as const };

    // Execute
    const result = await executionEngine.execute(goalWithTasks);

    return c.json({ success: true, data: { goalId, tasks: tasks.length, result: result.success ? result.data : null } }, 201);
  });

  // ─── Agents ──────────────────────────────────────────────────────────────

  app.get('/agents', (c) => {
    const status = c.req.query('status');
    const role = c.req.query('role');
    let agents = status ? agentRegistry.getAgentsByStatus(status as any) : role ? agentRegistry.getAgentsByRole(role as any) : agentRegistry.getAvailableAgents();
    return c.json({ success: true, data: agents });
  });

  app.get('/agents/stats', (c) => {
    const all = agentRegistry.getAvailableAgents();
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of all) {
      byRole[a.role] = (byRole[a.role] ?? 0) + 1;
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    return c.json({ success: true, data: { total: all.length, byRole, byStatus } });
  });

  // ─── Checkpoints ─────────────────────────────────────────────────────────

  app.get('/checkpoints/:goalId', (c) => {
    const checkpoints = checkpointManager.list(c.req.param('goalId'));
    return c.json({ success: true, data: checkpoints });
  });

  app.post('/checkpoints/:goalId', async (c) => {
    const body = await c.req.json();
    const goalId = c.req.param('goalId');
    const cp = checkpointManager.create(goalId, body.name ?? 'Manual checkpoint', body.description ?? '', {} as any, [], []);
    return c.json({ success: true, data: cp }, 201);
  });

  app.post('/checkpoints/:id/restore', (c) => {
    const cp = checkpointManager.restore(c.req.param('id'));
    if (!cp) throw createError(ErrorCode.NOT_FOUND, 'Checkpoint not found');
    return c.json({ success: true, data: cp });
  });

  app.delete('/checkpoints/:id', (c) => {
    checkpointManager.delete(c.req.param('id'));
    return c.json({ success: true });
  });

  return app;
}
