/**
 * Audit Routes
 */

import { Hono } from 'hono';
import type { IAuditService } from '../../modules/audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createAuditRouter(auditService: IAuditService, logger: ILogger): Hono {
  const router = new Hono();

  // GET /audit
  router.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await auditService.listAll({ page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /audit/:id
  router.get('/:id', async (c) => {
    const result = await auditService.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /audit/actor/:actorId
  router.get('/actor/:actorId', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await auditService.listByActor(c.req.param('actorId'), { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /audit/target/:targetId
  router.get('/target/:targetId', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await auditService.listByTarget(c.req.param('targetId'), { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
