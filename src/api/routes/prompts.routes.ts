import { Hono } from 'hono';
import type { IPromptService } from '../../modules/prompts/prompt.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreatePromptSchema } from '../../modules/prompts/prompt.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createPromptRouter(prompts: IPromptService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await prompts.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/public', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await prompts.listPublic({ page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/search', async (c) => {
    const user = c.get('user');
    const q = c.req.query('q') ?? '';
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await prompts.search(q, user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await prompts.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreatePromptSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await prompts.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/:id/fork', async (c) => {
    const actor = c.get('user');
    const result = await prompts.fork(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.delete('/:id', async (c) => {
    const actor = c.get('user');
    const result = await prompts.delete(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  return app;
}
