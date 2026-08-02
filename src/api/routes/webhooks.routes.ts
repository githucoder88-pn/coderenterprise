import { Hono } from 'hono';
import type { IWebhookService } from '../../modules/webhooks/webhook.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreateWebhookSchema } from '../../modules/webhooks/webhook.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createWebhookRouter(webhooks: IWebhookService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await webhooks.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await webhooks.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await webhooks.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.delete('/:id', async (c) => {
    const actor = c.get('user');
    const result = await webhooks.delete(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.get('/:id/deliveries', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await webhooks.getDeliveries(c.req.param('id'), { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  return app;
}
