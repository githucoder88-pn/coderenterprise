/**
 * Health Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from '../../../modules/health/health.service.js';
import { createMockLogger, createMockEventBus } from '../../helpers.js';
import type { RedisProvider } from '../../../providers/redis.provider.js';
import type { FirebaseProvider } from '../../../providers/firebase.provider.js';
import { vi } from 'vitest';

function createMockRedisProvider(): RedisProvider {
  return {
    redis: {} as any,
    cache: {} as any,
    connect: vi.fn(),
    disconnect: vi.fn(),
    healthCheck: vi.fn(async () => true),
  };
}

function createMockFirebaseProvider(): FirebaseProvider {
  return {
    firestore: {} as any,
    auth: {} as any,
    storage: {} as any,
    healthCheck: vi.fn(async () => ({
      firestore: true,
      auth: true,
      storage: true,
    })),
  };
}

describe('HealthService', () => {
  let service: HealthService;
  let redis: RedisProvider;
  let firebase: FirebaseProvider;

  beforeEach(() => {
    redis = createMockRedisProvider();
    firebase = createMockFirebaseProvider();
    service = new HealthService(redis, firebase, createMockLogger(), createMockEventBus());
  });

  describe('shallow', () => {
    it('should return ok status', async () => {
      const result = await service.shallow();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('ok');
        expect(typeof result.data.uptime).toBe('number');
      }
    });
  });

  describe('deep', () => {
    it('should return healthy when all services are up', async () => {
      const result = await service.deep();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('healthy');
        expect(result.data.checks['redis']?.status).toBe('healthy');
        expect(result.data.checks['firestore']?.status).toBe('healthy');
        expect(result.data.checks['auth']?.status).toBe('healthy');
        expect(result.data.checks['storage']?.status).toBe('healthy');
      }
    });

    it('should return degraded when Redis is down', async () => {
      (redis.healthCheck as any).mockResolvedValue(false);

      const result = await service.deep();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('degraded');
        expect(result.data.checks['redis']?.status).toBe('unhealthy');
      }
    });

    it('should return unhealthy when Firestore is down', async () => {
      (firebase.healthCheck as any).mockResolvedValue({
        firestore: false,
        auth: true,
        storage: true,
      });

      const result = await service.deep();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('unhealthy');
      }
    });

    it('should include version and timestamp', async () => {
      const result = await service.deep();
      if (result.success) {
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.timestamp).toBeDefined();
        expect(typeof result.data.uptime).toBe('number');
      }
    });
  });
});
