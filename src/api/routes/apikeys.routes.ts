/**
 * API Key Routes
 */

import { Hono } from 'hono';
import type { IApiKeyService } from '../../modules/apikeys/apikey.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreateApiKeySchema } from '../../modules/apikeys/apikey.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createApiKeyRouter(apiKeyService: IApiKeyService, _logger: ILogger): Hono {
  const router = new Hono();

  // GET /api-keys
  router.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);

    const result = await apiKeyService.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /api-keys
  router.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }
    const actor = c.get('user');
    const result = await apiKeyService.create({ ...parsed.data, organizationId: actor.organizationId }, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // DELETE /api-keys/:id
  router.delete('/:id', async (c) => {
    const actor = c.get('user');
    const result = await apiKeyService.revoke(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  return router;
}
