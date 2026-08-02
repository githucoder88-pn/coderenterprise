/**
 * Organization Routes
 */

import { Hono } from 'hono';
import type { IOrganizationService } from '../../modules/organizations/organization.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { CreateOrganizationSchema, UpdateOrganizationSchema, AddMemberSchema } from '../../modules/organizations/organization.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createOrganizationRouter(orgService: IOrganizationService, logger: ILogger): Hono {
  const router = new Hono();

  // GET /organizations/:id
  router.get('/:id', async (c) => {
    const result = await orgService.getById(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /organizations/slug/:slug
  router.get('/slug/:slug', async (c) => {
    const result = await orgService.getBySlug(c.req.param('slug'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /organizations
  router.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }
    const actor = c.get('user');
    const result = await orgService.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // PATCH /organizations/:id
  router.patch('/:id', async (c) => {
    const body = await c.req.json();
    const parsed = UpdateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }
    const actor = c.get('user');
    const result = await orgService.update(c.req.param('id'), parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // DELETE /organizations/:id
  router.delete('/:id', async (c) => {
    const actor = c.get('user');
    const result = await orgService.delete(c.req.param('id'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // POST /organizations/:id/members
  router.post('/:id/members', async (c) => {
    const body = await c.req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }
    const actor = c.get('user');
    const result = await orgService.addMember(c.req.param('id'), parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // DELETE /organizations/:id/members/:userId
  router.delete('/:id/members/:userId', async (c) => {
    const actor = c.get('user');
    const result = await orgService.removeMember(c.req.param('id'), c.req.param('userId'), actor);
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // GET /organizations/:id/members
  router.get('/:id/members', async (c) => {
    const result = await orgService.listMembers(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
