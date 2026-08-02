/**
 * Abuse Detection Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AbuseDetectionService } from '../../../services/security/abuse-detection.js';
import { createMockLogger } from '../../helpers.js';
import type { IRedisClient } from '../../../infrastructure/redis/redis-client.js';

function createMockRedis(): IRedisClient {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ttl?: number) => { store.set(key, value); }),
    del: vi.fn(async () => 1),
    exists: vi.fn(async (key: string) => store.has(key) ? 1 : 0),
    expire: vi.fn(async () => {}),
    ttl: vi.fn(async () => 3600),
    incr: vi.fn(async (key: string) => {
      const val = parseInt(store.get(key) ?? '0') + 1;
      store.set(key, String(val));
      return val;
    }),
    decr: vi.fn(async () => 0),
    incrBy: vi.fn(async (key: string, amount: number) => {
      const val = parseInt(store.get(key) ?? '0') + amount;
      store.set(key, String(val));
      return val;
    }),
    hset: vi.fn(async () => {}),
    hget: vi.fn(async () => null),
    hgetall: vi.fn(async () => ({})),
    hdel: vi.fn(async () => 0),
    lpush: vi.fn(async () => 0),
    rpush: vi.fn(async () => 0),
    lrange: vi.fn(async () => []),
    lrem: vi.fn(async () => 0),
    llen: vi.fn(async () => 0),
    keys: vi.fn(async (pattern: string) => [...store.keys()].filter((k) => k.includes(pattern.replace('*', '')))),
    scan: vi.fn(async () => ['0', []]),
    pipeline: vi.fn(() => ({} as any)),
    healthCheck: vi.fn(async () => true),
    disconnect: vi.fn(async () => {}),
    getClient: vi.fn(() => ({} as any)),
  };
}

describe('AbuseDetectionService', () => {
  let service: AbuseDetectionService;
  let redis: IRedisClient;

  beforeEach(() => {
    redis = createMockRedis();
    service = new AbuseDetectionService(redis, createMockLogger());
  });

  describe('analyzeRequest', () => {
    it('should allow normal requests', async () => {
      const result = await service.analyzeRequest('user-1', '1.2.3.4', '/api/users', 'GET', 100, 0);
      expect(result.action).toBe('allow');
    });

    it('should block oversized bodies', async () => {
      const result = await service.analyzeRequest('user-1', '1.2.3.4', '/api/test', 'POST', 5_000_000, 0);
      expect(result.action).toBe('throttle');
    });

    it('should detect credential stuffing', async () => {
      // Simulate many auth failures
      for (let i = 0; i < 5; i++) {
        await service.analyzeRequest(undefined, '1.2.3.4', '/api/v1/auth/sign-in', 'POST', 100, 0);
      }

      const result = await service.analyzeRequest(undefined, '1.2.3.4', '/api/v1/auth/sign-in', 'POST', 100, 0);
      expect(['captcha', 'block']).toContain(result.action);
    });
  });

  describe('reportAbuse', () => {
    it('should record abuse signals', async () => {
      await service.reportAbuse({
        type: 'rate_abuse',
        severity: 'high',
        evidence: { ip: '1.2.3.4' },
        timestamp: new Date(),
      });

      expect(redis.incr).toHaveBeenCalled();
    });
  });
});
