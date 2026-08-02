/**
 * Rate Limiting Middleware
 *
 * Token-bucket rate limiting using Redis.
 */

import { createMiddleware } from 'hono/factory';
import { ErrorCode, createError } from '../types/index.js';
import type { IRedisClient } from '../infrastructure/redis/redis-client.js';
import type { ILogger } from '../telemetry/logger.js';

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyPrefix?: string;
  readonly keyGenerator?: (c: any) => string;
}

export function rateLimitMiddleware(
  redis: IRedisClient,
  logger: ILogger,
  config: RateLimitConfig,
) {
  const prefix = config.keyPrefix ?? 'rl:';

  return createMiddleware(async (c, next) => {
    const key = config.keyGenerator
      ? config.keyGenerator(c)
      : `${prefix}${getClientIp(c)}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }

    const remaining = Math.max(0, config.maxRequests - current);
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + ttl * 1000;

    c.header('x-ratelimit-limit', String(config.maxRequests));
    c.header('x-ratelimit-remaining', String(remaining));
    c.header('x-ratelimit-reset', String(resetTime));

    if (current > config.maxRequests) {
      c.header('retry-after', String(ttl));
      logger.warn(
        { key, current, limit: config.maxRequests },
        'Rate limit exceeded',
      );
      throw createError(
        ErrorCode.RATE_LIMITED,
        'Too many requests',
        { retryAfter: ttl },
      );
    }

    await next();
  });
}

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}
