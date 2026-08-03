/**
 * Health Routes
 */

import { Hono } from 'hono';
import type { IHealthService } from '../../modules/health/health.service.js';

export function createHealthRouter(healthService: IHealthService): Hono {
  const router = new Hono();

  // GET /health
  router.get('/', async (c) => {
    const result = await healthService.shallow();
    return c.json({ success: true, data: result.success ? result.data : { status: 'unknown', uptime: 0 } }, 200);
  });

  // GET /health/deep
  router.get('/deep', async (c) => {
    const result = await healthService.deep();
    if (!result.success) throw result.error;
    const status = result.data.status === 'healthy' ? 200 : 503;
    return c.json({ success: true, data: result.data }, status);
  });

  return router;
}
