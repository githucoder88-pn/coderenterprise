/**
 * Distributed Rate Limiter
 *
 * Multi-tier rate limiting with sliding windows, per-user, per-org, and global limits.
 */

import type { ILogger } from '../../telemetry/logger.js';
import type { IRedisClient } from '../../infrastructure/redis/redis-client.js';

interface RateLimitTier {
  readonly name: string;
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly maxTokens?: number;
}

interface RateLimitResult {
  readonly allowed: boolean;
  readonly tier: string;
  readonly limit: number;
  readonly remaining: number;
  readonly resetMs: number;
  readonly retryAfterMs?: number;
}

const DEFAULT_TIERS: readonly RateLimitTier[] = [
  { name: 'second', windowMs: 1000, maxRequests: 10 },
  { name: 'minute', windowMs: 60_000, maxRequests: 200 },
  { name: 'hour', windowMs: 3_600_000, maxRequests: 5_000 },
  { name: 'day', windowMs: 86_400_000, maxRequests: 50_000 },
];

export class DistributedRateLimiter {
  private readonly tiers: readonly RateLimitTier[];

  constructor(
    private readonly redis: IRedisClient,
    private readonly logger: ILogger,
    tiers?: readonly RateLimitTier[],
  ) {
    this.tiers = tiers ?? DEFAULT_TIERS;
  }

  async check(key: string, cost = 1): Promise<RateLimitResult> {
    for (const tier of this.tiers) {
      const result = await this.checkTier(key, tier, cost);
      if (!result.allowed) return result;
    }

    // All tiers passed
    const tightest = this.tiers[0]!;
    return {
      allowed: true,
      tier: tightest.name,
      limit: tightest.maxRequests,
      remaining: tightest.maxRequests - 1,
      resetMs: Date.now() + tightest.windowMs,
    };
  }

  async checkUser(userId: string, cost = 1): Promise<RateLimitResult> {
    return this.check(`user:${userId}`, cost);
  }

  async checkOrg(orgId: string, cost = 1): Promise<RateLimitResult> {
    return this.check(`org:${orgId}`, cost);
  }

  async checkIp(ip: string, cost = 1): Promise<RateLimitResult> {
    return this.check(`ip:${ip}`, cost);
  }

  async checkTokenBudget(userId: string, tokensUsed: number, maxTokens: number): Promise<RateLimitResult> {
    const key = `token_budget:${userId}`;
    const windowMs = 3_600_000; // 1 hour
    const current = await this.redis.incrBy(key, tokensUsed);
    if (current === tokensUsed) await this.redis.expire(key, Math.ceil(windowMs / 1000));

    return {
      allowed: current <= maxTokens,
      tier: 'token_budget',
      limit: maxTokens,
      remaining: Math.max(0, maxTokens - current),
      resetMs: Date.now() + windowMs,
      retryAfterMs: current > maxTokens ? windowMs : undefined,
    };
  }

  async getUsage(key: string): Promise<Record<string, { current: number; limit: number }>> {
    const usage: Record<string, { current: number; limit: number }> = {};
    for (const tier of this.tiers) {
      const tierKey = `rl:${key}:${tier.name}`;
      const current = await this.redis.get(tierKey);
      usage[tier.name] = { current: parseInt(current ?? '0', 10), limit: tier.maxRequests };
    }
    return usage;
  }

  async reset(key: string): Promise<void> {
    for (const tier of this.tiers) {
      await this.redis.del(`rl:${key}:${tier.name}`);
    }
  }

  private async checkTier(
    key: string,
    tier: RateLimitTier,
    cost: number,
  ): Promise<RateLimitResult> {
    const tierKey = `rl:${key}:${tier.name}`;
    const windowSeconds = Math.ceil(tier.windowMs / 1000);

    // Sliding window using sorted sets
    const now = Date.now();
    const windowStart = now - tier.windowMs;

    // Use pipeline for atomic operations
    const pipeline = this.redis.getClient().pipeline();
    pipeline.zremrangebyscore(tierKey, 0, windowStart);
    pipeline.zadd(tierKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(tierKey);
    pipeline.expire(tierKey, windowSeconds);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;

    return {
      allowed: count <= tier.maxRequests,
      tier: tier.name,
      limit: tier.maxRequests,
      remaining: Math.max(0, tier.maxRequests - count),
      resetMs: now + tier.windowMs,
      retryAfterMs: count > tier.maxRequests ? tier.windowMs : undefined,
    };
  }
}
