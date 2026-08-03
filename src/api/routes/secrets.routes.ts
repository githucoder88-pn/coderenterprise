/**
 * Secrets Routes
 */

import { Hono } from 'hono';
import type { ISecretsService } from '../../modules/secrets/secrets.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createSecretsRouter(secretsService: ISecretsService, _logger: ILogger): Hono {
  const router = new Hono();

  // GET /secrets
  router.get('/', async (c) => {
    const user = c.get('user');
    const result = await secretsService.list(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /secrets/:name
  router.get('/:name', async (c) => {
    const user = c.get('user');
    const result = await secretsService.get(c.req.param('name'), user.organizationId);
    if (!result.success) throw result.error;
    // Return name and metadata only, never the value in GET
    return c.json({
      success: true,
      data: {
        id: result.data.id,
        name: result.data.name,
        organizationId: result.data.organizationId,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      },
    }, 200);
  });

  // POST /secrets
  router.post('/', async (c) => {
    const body = await c.req.json();
    if (!body.name || !body.value) {
      throw createError(ErrorCode.VALIDATION, 'name and value are required');
    }
    const user = c.get('user');
    const result = await secretsService.set({
      name: body.name,
      value: body.value,
      organizationId: user.organizationId,
    });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: { id: result.data.id, name: result.data.name } }, 201);
  });

  // DELETE /secrets/:name
  router.delete('/:name', async (c) => {
    const user = c.get('user');
    const result = await secretsService.delete(c.req.param('name'), user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  return router;
}
