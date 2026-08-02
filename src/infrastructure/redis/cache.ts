/**
 * Cache Service
 *
 * High-level caching layer on top of Redis.
 * Supports TTL, namespacing, serialization, and cache-aside patterns.
 */

import type { IRedisClient } from './redis-client.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<number>;
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T>;
  increment(key: string, amount?: number): Promise<number>;
  has(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  flushNamespace(namespace: string): Promise<number>;
}

export class CacheService implements ICacheService {
  constructor(
    private readonly redis: IRedisClient,
    private readonly logger: ILogger,
    private readonly defaultTtl = 300,
    private readonly namespace = 'cache',
  ) {}

  private nsKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.nsKey(key));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(this.nsKey(key), serialized, ttlSeconds ?? this.defaultTtl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.nsKey(key));
  }

  async delPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(`${this.namespace}:${pattern}`);
    if (keys.length === 0) return 0;
    return this.redis.del(keys);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug({ key }, 'Cache hit');
      return cached;
    }

    this.logger.debug({ key }, 'Cache miss');
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async increment(key: string, amount = 1): Promise<number> {
    return this.redis.incrBy(this.nsKey(key), amount);
  }

  async has(key: string): Promise<boolean> {
    return this.redis.exists(this.nsKey(key));
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(this.nsKey(key));
  }

  async flushNamespace(namespace: string): Promise<number> {
    return this.delPattern(`${namespace}:*`);
  }
}
