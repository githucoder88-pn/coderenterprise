/**
 * Security Headers Middleware
 */

import { createMiddleware } from 'hono/factory';

export const securityHeadersMiddleware = createMiddleware(async (c, next) => {
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  c.header('x-xss-protection', '0');
  c.header('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
  c.header('referrer-policy', 'strict-origin-when-cross-origin');
  c.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  c.header('content-security-policy', "default-src 'self'");
  await next();
});
