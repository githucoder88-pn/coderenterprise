/**
 * Analytics Routes
 */

import { Hono } from 'hono';
import type { IAnalyticsService } from '../../modules/analytics/analytics.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createAnalyticsRouter(analyticsService: IAnalyticsService, _logger: ILogger): Hono {
  const router = new Hono();

  // POST /analytics/track
  router.post('/track', async (c) => {
    const body = await c.req.json();
    if (!body.name) {
      throw createError(ErrorCode.VALIDATION, 'Event name is required');
    }
    const user = c.get('user');
    const result = await analyticsService.track({
      name: body.name,
      organizationId: user.organizationId,
      userId: user.uid,
      properties: body.properties,
    });
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // GET /analytics/usage
  router.get('/usage', async (c) => {
    const user = c.get('user');
    const period = c.req.query('period') ?? new Date().toISOString().slice(0, 7);
    const result = await analyticsService.getUsageMetrics(user.organizationId, period);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /analytics/top-events
  router.get('/top-events', async (c) => {
    const user = c.get('user');
    const limit = Number(c.req.query('limit') ?? 10);
    const result = await analyticsService.getTopEvents(user.organizationId, limit);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
