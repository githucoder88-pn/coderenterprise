/**
 * Auth Routes
 */

import { Hono } from 'hono';
import type { IAuthService } from '../../modules/auth/auth.service.js';
import type { IAuditService } from '../../modules/audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { SignInSchema, SignUpSchema } from '../../modules/auth/auth.types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createAuthRouter(
  authService: IAuthService,
  _auditService: IAuditService,
  _logger: ILogger,
): Hono {
  const router = new Hono();

  // POST /auth/sign-in
  router.post('/sign-in', async (c) => {
    const body = await c.req.json();
    const parsed = SignInSchema.safeParse(body);

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }

    const result = await authService.signIn(parsed.data);

    if (!result.success) {
      throw result.error;
    }

    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /auth/sign-up
  router.post('/sign-up', async (c) => {
    const body = await c.req.json();
    const parsed = SignUpSchema.safeParse(body);

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    }

    const result = await authService.signUp(parsed.data);

    if (!result.success) {
      throw result.error;
    }

    return c.json({ success: true, data: result.data }, 201);
  });

  // POST /auth/sign-out
  router.post('/sign-out', async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }

    const result = await authService.signOut(user.uid);
    if (!result.success) {
      throw result.error;
    }

    return c.json({ success: true }, 200);
  });

  // POST /auth/refresh
  router.post('/refresh', async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }

    const result = await authService.refreshToken(user.uid);
    if (!result.success) {
      throw result.error;
    }

    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /auth/me
  router.get('/me', async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }

    const result = await authService.getCurrentSession(user.uid);
    if (!result.success) {
      throw result.error;
    }

    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
