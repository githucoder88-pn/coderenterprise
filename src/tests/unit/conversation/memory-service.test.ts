/**
 * Memory Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../../../conversations/engine/memory-service.js';
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

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    service = new MemoryService(createMockCache(), createMockLogger());
  });

  describe('store', () => {
    it('should store a memory entry', async () => {
      const entry = await service.store({
        userId: 'user-1', organizationId: 'org-1', type: 'long_term',
        content: 'User prefers TypeScript', summary: null, importance: 80,
        tags: ['preference'], conversationId: null, expiresAt: null, metadata: {},
      });

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('long_term');
      expect(entry.importance).toBe(80);
    });

    it('should store short-term memories', async () => {
      const entry = await service.store({
        userId: 'user-1', organizationId: 'org-1', type: 'short_term',
        content: 'Current task: API design', summary: null, importance: 50,
        tags: [], conversationId: 'conv-1', expiresAt: null, metadata: {},
      });
      expect(entry.type).toBe('short_term');
    });
  });

  describe('retrieve', () => {
    it('should retrieve by user', async () => {
      await service.store({
        userId: 'user-1', organizationId: 'org-1', type: 'long_term',
        content: 'Memory 1', summary: null, importance: 80, tags: [], conversationId: null, expiresAt: null, metadata: {},
      });
      await service.store({
        userId: 'user-1', organizationId: 'org-1', type: 'episodic',
        content: 'Memory 2', summary: null, importance: 60, tags: [], conversationId: null, expiresAt: null, metadata: {},
      });

      const results = await service.retrieve({ userId: 'user-1', organizationId: 'org-1', query: '' });
      expect(results.length).toBe(2);
    });

    it('should filter by type', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'LT', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'short_term', content: 'ST', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const results = await service.retrieve({ userId: 'u1', organizationId: 'o1', query: '', type: 'long_term' });
      expect(results.length).toBe(1);
      expect(results[0]!.type).toBe('long_term');
    });

    it('should filter by importance', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'High', summary: null, importance: 90, tags: [], conversationId: null, expiresAt: null, metadata: {} });
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'Low', summary: null, importance: 10, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const results = await service.retrieve({ userId: 'u1', organizationId: 'o1', query: '', minImportance: 50 });
      expect(results.length).toBe(1);
      expect(results[0]!.importance).toBeGreaterThanOrEqual(50);
    });

    it('should filter by tags', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'Tagged', summary: null, importance: 50, tags: ['important'], conversationId: null, expiresAt: null, metadata: {} });
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'Untagged', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const results = await service.retrieve({ userId: 'u1', organizationId: 'o1', query: '', tags: ['important'] });
      expect(results.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a memory entry', async () => {
      const entry = await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'Original', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });
      const updated = await service.update(entry.id, { content: 'Updated', importance: 90 });
      expect(updated.content).toBe('Updated');
      expect(updated.importance).toBe(90);
    });
  });

  describe('consolidate', () => {
    it('should move important short-term to long-term', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'short_term', content: 'Important insight', summary: null, importance: 80, tags: [], conversationId: null, expiresAt: null, metadata: {} });
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'short_term', content: 'Low priority', summary: null, importance: 20, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const consolidated = await service.consolidate('u1');
      expect(consolidated).toBe(1);

      const stats = await service.getStats('u1');
      expect(stats.byType.long_term).toBe(1);
      expect(stats.byType.short_term).toBe(1);
    });
  });

  describe('getRelevantContext', () => {
    it('should return formatted context string', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'User likes TypeScript', summary: 'Prefers TS', importance: 80, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const context = await service.getRelevantContext('u1', 'o1', 'what language?', 1000);
      expect(typeof context).toBe('string');
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', async () => {
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'long_term', content: 'Memory 1', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });
      await service.store({ userId: 'u1', organizationId: 'o1', type: 'episodic', content: 'Memory 2', summary: null, importance: 50, tags: [], conversationId: null, expiresAt: null, metadata: {} });

      const stats = await service.getStats('u1');
      expect(stats.total).toBe(2);
      expect(stats.byType.long_term).toBe(1);
      expect(stats.byType.episodic).toBe(1);
    });
  });
});
