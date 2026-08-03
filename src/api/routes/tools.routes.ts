/**
 * Tool Execution & Model Registry API Routes
 */

import { Hono } from 'hono';
import type { ToolRegistry } from '../../tools/registry/tool-registry.js';
import type { DynamicModelRegistry } from '../../tools/registry/model-sync.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createToolRouter(
  registry: ToolRegistry,
  modelRegistry: DynamicModelRegistry,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Tool Listing ─────────────────────────────────────────────────────

  app.get('/', (c) => {
    const category = c.req.query('category') as any;
    const tools = registry.list(category);
    return c.json({ success: true, data: tools });
  });

  app.get('/stats', (c) => {
    return c.json({ success: true, data: registry.getStats() });
  });

  app.get('/:id', (c) => {
    const def = registry.getDefinition(c.req.param('id'));
    if (!def) throw createError(ErrorCode.NOT_FOUND, 'Tool not found');
    return c.json({ success: true, data: def });
  });

  // ─── Tool Execution ───────────────────────────────────────────────────

  app.post('/:id/execute', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const toolId = c.req.param('id');

    const result = await registry.execute(toolId, body.input ?? body, {
      executionId: crypto.randomUUID(), toolId,
      userId: user.uid, organizationId: user.organizationId,
      conversationId: body.conversationId ?? null,
      workspaceId: body.workspaceId ?? null,
      workingDirectory: body.workingDirectory ?? '/tmp',
      environment: body.environment ?? {},
      timeout: body.timeout ?? 30_000,
      dryRun: body.dryRun ?? false,
    });

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Execution History ────────────────────────────────────────────────

  app.get('/executions/history', (c) => {
    const user = c.get('user');
    const limit = Number(c.req.query('limit') ?? 50);
    return c.json({ success: true, data: registry.getExecutionHistory(user.uid, limit) });
  });

  // ─── Model Registry ──────────────────────────────────────────────────

  app.get('/models', async (c) => {
    const provider = c.req.query('provider') ?? undefined;
    const capability = c.req.query('capability') ?? undefined;
    const models = await modelRegistry.getModels({ provider, capability });
    return c.json({ success: true, data: models });
  });

  app.get('/models/search', async (c) => {
    const q = c.req.query('q') ?? '';
    const models = await modelRegistry.search(q);
    return c.json({ success: true, data: models });
  });

  app.get('/models/providers', async (c) => {
    const providers = await modelRegistry.getProviders();
    const lastSync = modelRegistry.getLastSyncTime();
    return c.json({ success: true, data: { providers, lastSync } });
  });

  app.post('/models/sync', async (c) => {
    const result = await modelRegistry.synchronize();
    return c.json({ success: true, data: result });
  });

  app.post('/models/sync/:provider', async (c) => {
    const result = await modelRegistry.synchronizeProvider(c.req.param('provider'));
    return c.json({ success: true, data: result });
  });

  app.get('/models/:id', async (c) => {
    const model = await modelRegistry.getModel(c.req.param('id'));
    if (!model) throw createError(ErrorCode.NOT_FOUND, 'Model not found');
    return c.json({ success: true, data: model });
  });

  return app;
}
