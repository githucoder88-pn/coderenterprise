/**
 * Request ID Middleware
 *
 * Attaches a unique request ID to every request for tracing.
 */

import { createMiddleware } from 'hono/factory';
import { nanoid } from 'nanoid';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? nanoid();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
});
