/**
 * User Routes
 */

import { Hono } from 'hono';
import type { IUserService } from '../../modules/users/user.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreateUserSchema, UpdateUserSchema } from '../../modules/users/user.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createUserRouter(userService: IUserService, logger: ILogger): Hono {
  const router = new Hono();

  // GET /users
  router.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);

    const result = await userService.listByOrganization(user.organizationId, {
      page,
      limit,
      sortBy: c.req.query('sortBy'),
      sortOrder: c.req.query('sortOrder') as 'asc' | 'desc' | undefined,
    });

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /users/:id
  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await userService.getById(id);

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /users
  router.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }

    const result = await userService.create(parsed.data);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // PATCH /users/:id
  router.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }

    const actor = c.get('user');
    const result = await userService.update(id, parsed.data, actor);

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // DELETE /users/:id
  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const actor = c.get('user');
    const result = await userService.delete(id, actor);

    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // POST /users/:id/suspend
  router.post('/:id/suspend', async (c) => {
    const id = c.req.param('id');
    const actor = c.get('user');
    const result = await userService.suspend(id, actor);

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /users/:id/reactivate
  router.post('/:id/reactivate', async (c) => {
    const id = c.req.param('id');
    const actor = c.get('user');
    const result = await userService.reactivate(id, actor);

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
