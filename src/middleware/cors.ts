/**
 * CORS Middleware
 */

import { cors as honoCors } from 'hono/cors';

export function corsMiddleware(origins: string[], credentials = true) {
  return honoCors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    exposeHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials,
    maxAge: 86400,
  });
}
