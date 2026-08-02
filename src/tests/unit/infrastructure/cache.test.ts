/**
 * Cache Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../../../infrastructure/redis/cache.js';
import { createMockLogger } from '../../helpers.js';
import type { IRedisClient } from '../../../infrastructure/redis/redis-client.js';

function createMockRedis(): IRedisClient {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ttl?: number) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      let count = 0;
      for (const k of keys) {
        if (store.delete(k)) count++;
      }
      return count;
    }),
    exists: vi.fn(async (key: string) => store.has(key)),
    expire: vi.fn(async () => {}),
    ttl: vi.fn(async () => 300),
    incr: vi.fn(async () => 1),
    decr: vi.fn(async () => 0),
    incrBy: vi.fn(async (_key: string, amount: number) => amount),
    hset: vi.fn(async () => {}),
    hget: vi.fn(async () => null),
    hgetall: vi.fn(async () => ({})),
    hdel: vi.fn(async () => 0),
    lpush: vi.fn(async () => 0),
    rpush: vi.fn(async () => 0),
    lrange: vi.fn(async () => []),
    lrem: vi.fn(async () => 0),
    llen: vi.fn(async () => 0),
    keys: vi.fn(async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    }),
    scan: vi.fn(async () => ['0', []]),
    pipeline: vi.fn(() => ({} as any)),
    healthCheck: vi.fn(async () => true),
    disconnect: vi.fn(async () => {}),
    getClient: vi.fn(() => ({} as any)),
  };
}

describe('CacheService', () => {
  let cache: CacheService;
  let redis: IRedisClient;

  beforeEach(() => {
    redis = createMockRedis();
    cache = new CacheService(redis, createMockLogger(), 300, 'test');
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { name: 'test' });
      const result = await cache.get('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('missing');
      expect(result).toBeNull();
    });

    it('should support TTL', async () => {
      await cache.set('key1', 'value', 60);
      expect(redis.set).toHaveBeenCalledWith(
        'test:key1',
        '"value"',
        60,
      );
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await cache.set('key1', 'value');
      await cache.del('key1');
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value on hit', async () => {
      await cache.set('key1', 'cached');
      const factory = vi.fn().mockResolvedValue('fresh');

      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory on cache miss', async () => {
      const factory = vi.fn().mockResolvedValue('fresh');

      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('fresh');
      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('key1', 'value');
      expect(await cache.has('key1')).toBe(true);
    });

    it('should return false for missing key', async () => {
      expect(await cache.has('missing')).toBe(false);
    });
  });

  describe('increment', () => {
    it('should increment by 1 by default', async () => {
      await cache.increment('counter');
      expect(redis.incrBy).toHaveBeenCalledWith('test:counter', 1);
    });

    it('should increment by custom amount', async () => {
      await cache.increment('counter', 5);
      expect(redis.incrBy).toHaveBeenCalledWith('test:counter', 5);
    });
  });
});
