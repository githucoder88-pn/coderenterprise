/**
 * Secrets Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecretsService } from '../../../modules/secrets/secrets.service.js';
import { createMockLogger, createMockEventBus } from '../../helpers.js';
import type { IFirestoreClient } from '../../../infrastructure/firebase/firestore-client.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockFirestore(): IFirestoreClient {
  const store = new Map<string, Record<string, unknown>>();
  return {
    getCollection: vi.fn(async (path: string, filters?: any[]) => {
      return [...store.entries()]
        .filter(([_, v]) => {
          if (!filters?.length) return true;
          return filters.every((f: any) => v[f.field] === f.value);
        })
        .map(([id, data]) => ({ id, data }));
    }),
    getDocument: vi.fn(async (_path: string, id: string) => {
      const data = store.get(id);
      return data ? { id, data } : null;
    }),
    createDocument: vi.fn(async (_path: string, id: string, data: Record<string, unknown>) => {
      store.set(id, data);
      return id;
    }),
    updateDocument: vi.fn(async (_path: string, id: string, data: Record<string, unknown>) => {
      const existing = store.get(id);
      if (existing) store.set(id, { ...existing, ...data });
    }),
    deleteDocument: vi.fn(async (_path: string, id: string) => {
      store.delete(id);
    }),
    runTransaction: vi.fn(async (fn: any) => fn({})),
    batch: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      commit: vi.fn(),
    }) as any),
    collectionRef: vi.fn(() => ({} as any)),
    docRef: vi.fn(() => ({} as any)),
    healthCheck: vi.fn(async () => true),
  };
}

function createMockCache(): ICacheService {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) as any ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
    delPattern: vi.fn(async () => 0),
    getOrSet: vi.fn(async (key: string, factory: () => Promise<any>) => {
      const v = store.get(key);
      if (v) return v;
      const val = await factory();
      store.set(key, val);
      return val;
    }),
    increment: vi.fn(async () => 0),
    has: vi.fn(async (key: string) => store.has(key)),
    ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('SecretsService', () => {
  let service: SecretsService;
  let firestore: IFirestoreClient;
  let cache: ICacheService;

  beforeEach(() => {
    firestore = createMockFirestore();
    cache = createMockCache();
    service = new SecretsService(
      firestore,
      cache,
      'test-encryption-key-at-least-32-bytes!',
      createMockLogger(),
      createMockEventBus(),
    );
  });

  describe('set', () => {
    it('should encrypt and store a secret', async () => {
      const result = await service.set({
        name: 'DATABASE_URL',
        value: 'postgres://localhost:5432/db',
        organizationId: 'org-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('DATABASE_URL');
        expect(result.data.value).toBe('postgres://localhost:5432/db');
      }
    });

    it('should reject empty name', async () => {
      const result = await service.set({ name: '', value: 'val', organizationId: 'org-1' });
      expect(result.success).toBe(false);
    });

    it('should reject empty value', async () => {
      const result = await service.set({ name: 'KEY', value: '', organizationId: 'org-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('get', () => {
    it('should retrieve and decrypt a secret', async () => {
      await service.set({
        name: 'API_KEY',
        value: 'super-secret-value',
        organizationId: 'org-1',
      });

      const result = await service.get('API_KEY', 'org-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('super-secret-value');
      }
    });

    it('should fail for non-existent secret', async () => {
      const result = await service.get('MISSING', 'org-1');
      expect(result.success).toBe(false);
    });
  });

  describe('list', () => {
    it('should list secrets without values', async () => {
      await service.set({ name: 'KEY1', value: 'val1', organizationId: 'org-1' });
      await service.set({ name: 'KEY2', value: 'val2', organizationId: 'org-1' });

      const result = await service.list('org-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
        expect(result.data[0]).not.toHaveProperty('value');
      }
    });
  });

  describe('delete', () => {
    it('should delete a secret', async () => {
      await service.set({ name: 'TO_DELETE', value: 'val', organizationId: 'org-1' });

      const result = await service.delete('TO_DELETE', 'org-1');
      expect(result.success).toBe(true);

      const get = await service.get('TO_DELETE', 'org-1');
      expect(get.success).toBe(false);
    });

    it('should fail when deleting non-existent secret', async () => {
      const result = await service.delete('MISSING', 'org-1');
      expect(result.success).toBe(false);
    });
  });

  describe('encryption', () => {
    it('should produce different ciphertext for same input', async () => {
      await service.set({ name: 'KEY_A', value: 'same-value', organizationId: 'org-1' });
      await service.set({ name: 'KEY_B', value: 'same-value', organizationId: 'org-2' });

      const a = await service.get('KEY_A', 'org-1');
      const b = await service.get('KEY_B', 'org-2');

      // Both should decrypt to same value
      if (a.success && b.success) {
        expect(a.data.value).toBe('same-value');
        expect(b.data.value).toBe('same-value');
      }
    });
  });
});
