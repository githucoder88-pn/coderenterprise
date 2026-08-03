/**
 * Runtime API Routes
 */

import { Hono } from 'hono';
import type { RuntimeManager } from '../../runtime/orchestrator/runtime-manager.js';
import type { ApprovalManager } from '../../runtime/approvals/approval-manager.js';
import type { RuntimeMemoryStore } from '../../runtime/memory/runtime-memory.js';
import type { PolicyManager } from '../../runtime/policies/runtime-policies.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { StartWorkflowSchema } from '../../runtime/types.js';

export function createRuntimeRouter(
  runtime: RuntimeManager,
  approvals: ApprovalManager,
  memory: RuntimeMemoryStore,
  policies: PolicyManager,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Workflows ──────────────────────────────────────────────────────────

  app.post('/workflows', async (c) => {
    const body = await c.req.json();
    const parsed = StartWorkflowSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await runtime.createWorkflow(parsed.data.goal, parsed.data.mode, {
      maxRetries: parsed.data.maxRetries, approvalRequired: parsed.data.approvalRequired,
    });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.get('/workflows', (c) => {
    const status = c.req.query('status');
    return c.json({ success: true, data: runtime.listWorkflows(status as any) });
  });

  app.get('/workflows/:id', (c) => {
    const wf = runtime.getWorkflow(c.req.param('id'));
    if (!wf) throw createError(ErrorCode.NOT_FOUND, 'Workflow not found');
    return c.json({ success: true, data: wf });
  });

  app.post('/workflows/:id/start', async (c) => {
    const result = await runtime.startWorkflow(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/workflows/:id/pause', (c) => {
    const result = runtime.pauseWorkflow(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/workflows/:id/resume', async (c) => {
    const result = await runtime.resumeWorkflow(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/workflows/:id/cancel', (c) => {
    const result = runtime.cancelWorkflow(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/workflows/:id/tasks/:taskId/complete', async (c) => {
    const body = await c.req.json();
    const result = await runtime.completeTask(c.req.param('id'), c.req.param('taskId'), body.output ?? '');
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/workflows/:id/tasks/:taskId/fail', async (c) => {
    const body = await c.req.json();
    const result = await runtime.failTask(c.req.param('id'), c.req.param('taskId'), body.error ?? 'Unknown error');
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/workflows/stats', (c) => {
    return c.json({ success: true, data: runtime.getStats() });
  });

  // ─── Approvals ──────────────────────────────────────────────────────────

  app.get('/approvals', (c) => {
    return c.json({ success: true, data: approvals.getPending() });
  });

  app.get('/approvals/history', (c) => {
    return c.json({ success: true, data: approvals.getHistory() });
  });

  app.post('/approvals/:id/approve', (c) => {
    const body = c.req.json() as any;
    const result = approvals.approve(c.req.param('id'), 'user', body?.reason);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/approvals/:id/reject', async (c) => {
    const body = await c.req.json();
    const result = approvals.reject(c.req.param('id'), 'user', body.reason ?? 'Rejected');
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Memory ─────────────────────────────────────────────────────────────

  app.get('/memory/stats', (c) => {
    return c.json({ success: true, data: memory.getStats() });
  });

  app.post('/memory/store', async (c) => {
    const body = await c.req.json();
    memory.store(body.layer ?? 'working', body.key, body.value, body.importance);
    return c.json({ success: true });
  });

  app.post('/memory/search', async (c) => {
    const body = await c.req.json();
    const results = memory.search(body.query, body.layers);
    return c.json({ success: true, data: results });
  });

  // ─── Policies ───────────────────────────────────────────────────────────

  app.get('/policies', (c) => {
    const domain = c.req.query('domain');
    return c.json({ success: true, data: policies.getPolicies(domain as any) });
  });

  app.post('/policies/evaluate', async (c) => {
    const body = await c.req.json();
    const result = policies.evaluate(body.domain, body.action, body.resource, body.context);
    return c.json({ success: true, data: result });
  });

  return app;
}
