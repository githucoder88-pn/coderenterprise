import { Hono } from 'hono';
import type { IWorkspaceService } from '../../modules/workspaces/workspace.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '../../modules/workspaces/workspace.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createWorkspaceRouter(ws: IWorkspaceService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await ws.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await ws.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateWorkspaceSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await ws.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = UpdateWorkspaceSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await ws.update(c.req.param('id'), parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.delete('/:id', async (c) => {
    const actor = c.get('user');
    const result = await ws.delete(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  return app;
}
