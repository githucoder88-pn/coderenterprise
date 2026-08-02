import { Hono } from 'hono';
import type { IModelRegistryService } from '../../modules/models/model.service.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createModelRouter(models: IModelRegistryService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await models.listActive({ page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/search', async (c) => {
    const q = c.req.query('q') ?? '';
    const result = await models.search(q);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/provider/:provider', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await models.listByProvider(c.req.param('provider'), { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await models.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/compare', async (c) => {
    const body = await c.req.json();
    const result = await models.getComparison(body.modelIds ?? []);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  return app;
}
