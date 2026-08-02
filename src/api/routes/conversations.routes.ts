import { Hono } from 'hono';
import type { IConversationService } from '../../modules/conversations/conversation.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { CreateConversationSchema } from '../../modules/conversations/conversation.types.js';

export function createConversationRouter(conv: IConversationService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await conv.listByUser(user.uid, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await conv.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id/messages', async (c) => {
    const limit = Number(c.req.query('limit') ?? 100);
    const result = await conv.getMessages(c.req.param('id'), limit);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateConversationSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await conv.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/:id/messages', async (c) => {
    const body = await c.req.json();
    const result = await conv.addMessage(c.req.param('id'), body);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/:id/archive', async (c) => {
    const actor = c.get('user');
    const result = await conv.archive(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  return app;
}
