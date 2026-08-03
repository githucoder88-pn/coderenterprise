/**
 * Memory Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryManager } from '../../../knowledge/memory/memory-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0), getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async () => 0), has: vi.fn(async () => false), ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => { manager = new MemoryManager(createMockCache(), createMockLogger()); });

  describe('store', () => {
    it('should store a memory entry', async () => {
      const entry = await manager.store({
        layer: 'semantic', userId: 'u1', organizationId: 'o1',
        key: 'preference', value: 'User prefers TypeScript',
        importance: 80, tags: ['preference'], source: 'conversation',
      });
      expect(entry.id).toBeDefined();
      expect(entry.layer).toBe('semantic');
      expect(entry.importance).toBe(80);
    });

    it('should store across all 7 layers', async () => {
      const layers = ['working', 'session', 'conversation', 'semantic', 'workspace', 'organizational', 'global'] as const;
      for (const layer of layers) {
        await manager.store({ layer, userId: 'u1', organizationId: 'o1', key: `${layer}-key`, value: 'data', importance: 50, tags: [], source: 'test' });
      }
      const stats = await manager.getStats('u1', 'o1');
      for (const layer of layers) {
        expect(stats[layer].entries).toBe(1);
      }
    });

    it('should update existing entries', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'k1', value: 'v1', importance: 50, tags: [], source: 'test' });
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'k1', value: 'v2', importance: 80, tags: [], source: 'test' });
      const entry = await manager.retrieve('working', 'k1', 'u1');
      expect(entry!.value).toBe('v2');
    });
  });

  describe('retrieve', () => {
    it('should retrieve by layer and key', async () => {
      await manager.store({ layer: 'session', userId: 'u1', organizationId: 'o1', key: 'task', value: 'Built API', importance: 60, tags: [], source: 'test' });
      const entry = await manager.retrieve('session', 'task', 'u1');
      expect(entry).not.toBeNull();
      expect(entry!.value).toBe('Built API');
    });

    it('should return null for missing entries', async () => {
      expect(await manager.retrieve('semantic', 'missing', 'u1')).toBeNull();
    });

    it('should track access count', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'k', value: 'v', importance: 50, tags: [], source: 'test' });
      await manager.retrieve('working', 'k', 'u1');
      await manager.retrieve('working', 'k', 'u1');
      const entry = await manager.retrieve('working', 'k', 'u1');
      expect(entry!.accessCount).toBe(4); // 1 from store + 3 from retrieve
    });
  });

  describe('search', () => {
    it('should search across layers', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'ctx', value: 'Building REST API', importance: 50, tags: [], source: 'test' });
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'knowledge', value: 'REST APIs use HTTP methods', importance: 70, tags: [], source: 'test' });

      const results = await manager.search('API', 'u1', 'o1');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by layer', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'k1', value: 'API context', importance: 50, tags: [], source: 'test' });
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'k2', value: 'API knowledge', importance: 70, tags: [], source: 'test' });

      const results = await manager.search('API', 'u1', 'o1', ['working']);
      expect(results.length).toBe(1);
    });

    it('should search by tags', async () => {
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'k', value: 'Important fact', importance: 50, tags: ['important'], source: 'test' });
      const results = await manager.search('important', 'u1', 'o1');
      expect(results.length).toBe(1);
    });

    it('should rank by importance', async () => {
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'low', value: 'api low', importance: 20, tags: [], source: 'test' });
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'high', value: 'api high', importance: 90, tags: [], source: 'test' });

      const results = await manager.search('api', 'u1', 'o1');
      expect(results[0]!.key).toBe('high');
    });
  });

  describe('consolidate', () => {
    it('should move high-importance working memories to semantic', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'insight', value: 'Important finding', importance: 80, tags: [], source: 'test' });
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'temp', value: 'Temp data', importance: 20, tags: [], source: 'test' });

      const result = await manager.consolidate('u1', 'o1');
      expect(result.consolidated).toBe(1);
    });
  });

  describe('getRelevantContext', () => {
    it('should build context string', async () => {
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'k1', value: 'REST API knowledge', importance: 80, tags: [], source: 'test' });

      const context = await manager.getRelevantContext('u1', 'o1', 'API', 1000);
      expect(context).toContain('REST API');
      expect(context).toContain('[semantic]');
    });

    it('should respect token budget', async () => {
      for (let i = 0; i < 50; i++) {
        await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: `k${i}`, value: 'word '.repeat(100), importance: 50, tags: [], source: 'test' });
      }
      const context = await manager.getRelevantContext('u1', 'o1', 'word', 500);
      expect(Math.ceil(context.length / 4)).toBeLessThanOrEqual(600); // Some overhead
    });
  });

  describe('compact', () => {
    it('should remove expired entries', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'expired', value: 'old', importance: 50, tags: [], source: 'test', expiresAt: new Date(Date.now() - 1000) });
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'valid', value: 'new', importance: 50, tags: [], source: 'test' });
      const removed = await manager.compact('working');
      expect(removed).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear specific layer', async () => {
      await manager.store({ layer: 'working', userId: 'u1', organizationId: 'o1', key: 'k1', value: 'v', importance: 50, tags: [], source: 'test' });
      await manager.store({ layer: 'semantic', userId: 'u1', organizationId: 'o1', key: 'k2', value: 'v', importance: 50, tags: [], source: 'test' });
      manager.clear('working');
      expect(await manager.retrieve('working', 'k1', 'u1')).toBeNull();
      expect(await manager.retrieve('semantic', 'k2', 'u1')).not.toBeNull();
    });
  });
});
