/**
 * Authentication Middleware
 *
 * JWT-based auth with optional and required modes.
 * Also supports API key authentication.
 */

import { createMiddleware } from 'hono/factory';
import { ErrorCode, createError, type AuthenticatedUser } from '../types/index.js';
import type { IAuthClient } from '../infrastructure/firebase/auth-client.js';
import type { IRBACService } from '../modules/rbac/rbac.service.js';
import type { IApiKeyService } from '../modules/apikeys/apikey.service.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

export function authMiddleware(
  authClient: IAuthClient,
  rbacService: IRBACService,
) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(
        ErrorCode.UNAUTHORIZED,
        'Missing or invalid authorization header',
      );
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await authClient.verifyIdToken(token);

      const permissions = rbacService.getPermissionsForRole(
        (decoded['role'] as string) ?? 'member',
      );

      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        organizationId: (decoded['organizationId'] as string) ?? '',
        role: (decoded['role'] as string) ?? 'member',
        permissions,
      };

      c.set('user', user);
      await next();
    } catch {
      throw createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid or expired token',
      );
    }
  });
}

export function optionalAuthMiddleware(
  authClient: IAuthClient,
  rbacService: IRBACService,
) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await next();
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await authClient.verifyIdToken(token);
      const permissions = rbacService.getPermissionsForRole(
        (decoded['role'] as string) ?? 'member',
      );

      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        organizationId: (decoded['organizationId'] as string) ?? '',
        role: (decoded['role'] as string) ?? 'member',
        permissions,
      };

      c.set('user', user);
    } catch {
      // Token invalid, proceed without auth
    }

    await next();
  });
}

export function apiKeyAuthMiddleware(apiKeyService: IApiKeyService) {
  return createMiddleware(async (c, next) => {
    const apiKey = c.req.header('x-api-key');

    if (!apiKey) {
      throw createError(
        ErrorCode.UNAUTHORIZED,
        'Missing API key',
      );
    }

    const result = await apiKeyService.validateKey(apiKey);

    if (!result.success) {
      throw createError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid API key',
      );
    }

    c.set('user', result.data);
    await next();
  });
}
