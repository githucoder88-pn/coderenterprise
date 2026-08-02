/**
 * Cluster API Routes
 */

import { Hono } from 'hono';
import type { QueueManager } from '../../cluster/queues/queue-manager.js';
import type { WorkerManager } from '../../cluster/workers/worker-manager.js';
import type { JobScheduler } from '../../cluster/scheduler/job-scheduler.js';
import type { AutoScaler } from '../../cluster/scaling/auto-scaler.js';
import type { ClusterMonitor } from '../../cluster/monitoring/cluster-monitor.js';
import type { ServiceRegistry } from '../../cluster/registry/service-registry.js';
import type { DistributedEventBus } from '../../cluster/events/distributed-event-bus.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { EnqueueJobSchema } from '../../cluster/types.js';

export function createClusterRouter(
  queueManager: QueueManager,
  workerManager: WorkerManager,
  scheduler: JobScheduler,
  autoScaler: AutoScaler,
  clusterMonitor: ClusterMonitor,
  serviceRegistry: ServiceRegistry,
  eventBus: DistributedEventBus,
  logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Queue Operations ───────────────────────────────────────────────────

  app.get('/queues/stats', async (c) => {
    const stats = await queueManager.getAllStats();
    return c.json({ success: true, data: stats });
  });

  app.post('/queues/enqueue', async (c) => {
    const body = await c.req.json();
    const parsed = EnqueueJobSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const job = await queueManager.enqueue(parsed.data.queue, parsed.data.name, parsed.data.data, {
      priority: parsed.data.priority, delay: parsed.data.delay, maxAttempts: parsed.data.maxAttempts,
    });
    return c.json({ success: true, data: job }, 201);
  });

  app.post('/queues/:name/pause', async (c) => {
    await queueManager.pause(c.req.param('name') as any);
    return c.json({ success: true });
  });

  app.post('/queues/:name/resume', async (c) => {
    await queueManager.resume(c.req.param('name') as any);
    return c.json({ success: true });
  });

  // ─── Worker Operations ──────────────────────────────────────────────────

  app.get('/workers', (c) => {
    return c.json({ success: true, data: workerManager.getWorkers() });
  });

  app.get('/workers/stats', (c) => {
    return c.json({ success: true, data: workerManager.getWorkerStats() });
  });

  // ─── Cluster Health ─────────────────────────────────────────────────────

  app.get('/health', (c) => {
    return c.json({ success: true, data: clusterMonitor.getHealth() });
  });

  app.get('/nodes', (c) => {
    return c.json({ success: true, data: clusterMonitor.getNodes() });
  });

  // ─── Scaling ────────────────────────────────────────────────────────────

  app.get('/scaling/metrics', (c) => {
    return c.json({ success: true, data: autoScaler.getMetrics().slice(-50) });
  });

  app.get('/scaling/decisions', (c) => {
    return c.json({ success: true, data: autoScaler.getDecisions().slice(-20) });
  });

  // ─── Service Registry ───────────────────────────────────────────────────

  app.get('/services', (c) => {
    return c.json({ success: true, data: serviceRegistry.getStats() });
  });

  // ─── Events ─────────────────────────────────────────────────────────────

  app.get('/events/stats', (c) => {
    return c.json({ success: true, data: eventBus.getStats() });
  });

  app.get('/events/history', (c) => {
    const name = c.req.query('event') as any;
    const limit = Number(c.req.query('limit') ?? 50);
    return c.json({ success: true, data: eventBus.getHistory(name, limit) });
  });

  // ─── Scheduler ──────────────────────────────────────────────────────────

  app.get('/scheduler/jobs', (c) => {
    return c.json({ success: true, data: scheduler.list() });
  });

  return app;
}
