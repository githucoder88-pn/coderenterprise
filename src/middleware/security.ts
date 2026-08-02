/**
 * Security Middleware
 *
 * Integrates zero-trust, abuse detection, CSRF, XSS, and distributed rate limiting.
 */

import { createMiddleware } from 'hono/factory';
import type { ZeroTrustService } from '../services/security/zero-trust.js';
import type { AbuseDetectionService } from '../services/security/abuse-detection.js';
import type { DistributedRateLimiter } from '../services/security/rate-limiter.js';
import type { CsrfProtectionService } from '../services/security/csrf-protection.js';
import type { XssProtectionService } from '../services/security/xss-protection.js';
import { ErrorCode, createError } from '../types/index.js';
import type { ILogger } from '../telemetry/logger.js';

/**
 * Zero-trust evaluation middleware.
 */
export function zeroTrustMiddleware(zeroTrust: ZeroTrustService, logger: ILogger) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) { await next(); return; }

    const verdict = await zeroTrust.evaluate(
      {
        user, ip: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        userAgent: c.req.header('user-agent') ?? '', requestId: c.get('requestId') ?? '',
        timestamp: new Date(), path: c.req.path, method: c.req.method,
      },
      { requireAuth: true, requiredPermissions: [] },
    );

    if (!verdict.allowed) {
      logger.warn({ verdict, path: c.req.path }, 'Zero-trust: request denied');
      throw createError(ErrorCode.FORBIDDEN, `Access denied: ${verdict.reason}`, { riskScore: verdict.riskScore, flags: verdict.flags });
    }

    await next();
  });
}

/**
 * Abuse detection middleware.
 */
export function abuseDetectionMiddleware(abuse: AbuseDetectionService, logger: ILogger) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const bodySize = parseInt(c.req.header('content-length') ?? '0', 10);

    const action = await abuse.analyzeRequest(user?.uid, ip, c.req.path, c.req.method, bodySize, 0);

    switch (action.action) {
      case 'block':
        throw createError(ErrorCode.FORBIDDEN, action.reason);
      case 'throttle':
        logger.warn({ action, ip, path: c.req.path }, 'Abuse: throttled');
        break;
      case 'captcha':
        logger.warn({ action, ip }, 'Abuse: captcha required');
        break;
    }

    await next();
  });
}

/**
 * Distributed rate limiting middleware.
 */
export function distributedRateLimitMiddleware(rateLimiter: DistributedRateLimiter) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // Check IP rate limit
    const ipResult = await rateLimiter.checkIp(ip);
    if (!ipResult.allowed) {
      c.header('x-ratelimit-limit', String(ipResult.limit));
      c.header('x-ratelimit-remaining', '0');
      c.header('retry-after', String(Math.ceil((ipResult.retryAfterMs ?? 60000) / 1000)));
      throw createError(ErrorCode.RATE_LIMITED, 'Rate limit exceeded', { tier: ipResult.tier });
    }

    // Check user rate limit if authenticated
    if (user) {
      const userResult = await rateLimiter.checkUser(user.uid);
      if (!userResult.allowed) {
        throw createError(ErrorCode.RATE_LIMITED, 'User rate limit exceeded', { tier: userResult.tier });
      }
    }

    c.header('x-ratelimit-limit', String(ipResult.limit));
    c.header('x-ratelimit-remaining', String(ipResult.remaining));
    c.header('x-ratelimit-reset', String(ipResult.resetMs));

    await next();
  });
}

/**
 * CSRF protection middleware for state-changing requests.
 */
export function csrfMiddleware(csrf: CsrfProtectionService) {
  return createMiddleware(async (c, next) => {
    const method = c.req.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Skip CSRF for API key authenticated requests
      const apiKey = c.req.header('x-api-key');
      if (apiKey) { await next(); return; }

      const token = c.req.header('x-csrf-token') ?? '';
      const sessionId = c.get('user')?.uid ?? '';

      if (sessionId && !csrf.validateToken(token, sessionId)) {
        throw createError(ErrorCode.FORBIDDEN, 'Invalid CSRF token');
      }
    }

    await next();
  });
}

/**
 * XSS protection headers middleware.
 */
export function xssProtectionMiddleware(xss: XssProtectionService) {
  return createMiddleware(async (c, next) => {
    const nonce = xss.generateNonce();
    const headers = xss.getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(headers)) {
      c.header(key.toLowerCase(), value);
    }
    c.set('cspNonce' as any, nonce);
    await next();
  });
}
