/**
 * Distributed Agent Platform API Routes
 */

import { Hono } from 'hono';
import type { ClusterManager } from '../../cluster/coordinator/cluster-manager.js';
import type { AgentScheduler } from '../../cluster/coordinator/agent-scheduler.js';
import type { DistributedCheckpointManager } from '../../cluster/coordinator/distributed-checkpoints.js';
import type { DistributedMemoryStore } from '../../cluster/coordinator/distributed-memory.js';
import type { HealthMonitor } from '../../cluster/coordinator/health-monitor.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { ScheduleAgentSchema } from '../../cluster/coordinator/types.js';

export function createDistributedRouter(
  clusterManager: ClusterManager,
  agentScheduler: AgentScheduler,
  checkpointManager: DistributedCheckpointManager,
  memoryStore: DistributedMemoryStore,
  healthMonitor: HealthMonitor,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Cluster Health ─────────────────────────────────────────────────────

  app.get('/health', (c) => {
    return c.json({ success: true, data: healthMonitor.getClusterHealth() });
  });

  app.get('/regions', (c) => {
    return c.json({ success: true, data: clusterManager.getRegions() });
  });

  app.get('/regions/:id/health', (c) => {
    return c.json({ success: true, data: healthMonitor.getRegionHealth(c.req.param('id') as any) });
  });

  app.get('/stats', (c) => {
    return c.json({ success: true, data: clusterManager.getStats() });
  });

  // ─── Nodes ──────────────────────────────────────────────────────────────

  app.get('/nodes', (c) => {
    const region = c.req.query('region');
    const nodes = region
      ? clusterManager.getNodesByRegion(region as any)
      : clusterManager.getAvailableNodes();
    return c.json({ success: true, data: nodes });
  });

  app.get('/nodes/unhealthy', (c) => {
    return c.json({ success: true, data: healthMonitor.getUnhealthyNodes() });
  });

  // ─── Agents ─────────────────────────────────────────────────────────────

  app.post('/agents', async (c) => {
    const body = await c.req.json();
    const parsed = ScheduleAgentSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const agent = await agentScheduler.scheduleAgent({
      role: parsed.data.role, goal: parsed.data.goal,
      maxRetries: parsed.data.maxRetries, metadata: parsed.data.metadata ?? {},
      memory: { agentId: '', scope: 'short_term', entries: [], syncStatus: 'synced', lastSyncedAt: null },
    }, parsed.data.region as any);
    return c.json({ success: true, data: agent }, 201);
  });

  app.get('/agents', (c) => {
    const status = c.req.query('status');
    const region = c.req.query('region');
    let agents = status ? agentScheduler.getAgentsByStatus(status as any) : region ? agentScheduler.getAgentsByRegion(region as any) : [];
    return c.json({ success: true, data: agents });
  });

  app.get('/agents/:id', (c) => {
    const agent = agentScheduler.getAgent(c.req.param('id'));
    if (!agent) throw createError(ErrorCode.NOT_FOUND, 'Agent not found');
    return c.json({ success: true, data: agent });
  });

  app.post('/agents/:id/start', (c) => {
    agentScheduler.startExecution(c.req.param('id'));
    return c.json({ success: true });
  });

  app.post('/agents/:id/complete', (c) => {
    agentScheduler.completeAgent(c.req.param('id'));
    return c.json({ success: true });
  });

  app.post('/agents/:id/migrate', async (c) => {
    const body = await c.req.json();
    const result = agentScheduler.migrateAgent(c.req.param('id'), body.targetNodeId);
    if (!result) throw createError(ErrorCode.NOT_FOUND, 'Agent or target node not found');
    return c.json({ success: true });
  });

  app.post('/agents/:id/recover', async (c) => {
    const body = await c.req.json();
    const result = agentScheduler.recoverFromCheckpoint(c.req.param('id'), body.checkpointId);
    if (!result) throw createError(ErrorCode.NOT_FOUND, 'Agent not found');
    return c.json({ success: true });
  });

  app.get('/agents/stats', (c) => {
    return c.json({ success: true, data: agentScheduler.getStats() });
  });

  // ─── Checkpoints ────────────────────────────────────────────────────────

  app.get('/checkpoints', (c) => {
    return c.json({ success: true, data: checkpointManager.getStats() });
  });

  app.get('/checkpoints/agent/:agentId', (c) => {
    return c.json({ success: true, data: checkpointManager.getByAgent(c.req.param('agentId')) });
  });

  app.post('/checkpoints/:id/restore', (c) => {
    const cp = checkpointManager.restore(c.req.param('id'));
    if (!cp) throw createError(ErrorCode.NOT_FOUND, 'Checkpoint not found');
    return c.json({ success: true, data: cp });
  });

  app.post('/checkpoints/:id/replicate', async (c) => {
    const body = await c.req.json();
    const replica = await checkpointManager.replicate(c.req.param('id'), body.targetRegion);
    return c.json({ success: true, data: replica });
  });

  // ─── Memory ─────────────────────────────────────────────────────────────

  app.get('/memory/:agentId', (c) => {
    return c.json({ success: true, data: memoryStore.getStats(c.req.param('agentId')) });
  });

  return app;
}
