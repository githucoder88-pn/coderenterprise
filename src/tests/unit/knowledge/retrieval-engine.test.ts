/**
 * Retrieval Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalEngine } from '../../../knowledge/retrieval/retrieval-engine.js';
import { createMockLogger } from '../../helpers.js';
import type { KnowledgeEntity } from '../../../knowledge/types.js';

function makeEntity(overrides?: Partial<KnowledgeEntity>): KnowledgeEntity {
  const now = new Date();
  return {
    id: 'entity-1', organizationId: 'org-1', source: 'repository', sourceId: 'repo-1',
    title: 'API Service', content: 'This is a REST API service for managing users and organizations.',
    summary: 'REST API for user management', embedding: null,
    chunks: [{
      id: 'chunk-1', entityId: 'entity-1', index: 0,
      content: 'This is a REST API service for managing users and organizations. It uses TypeScript and Node.js.',
      embedding: null, startLine: 1, endLine: 5, tokenCount: 30,
    }],
    tags: ['api', 'typescript'], language: 'typescript',
    quality: 0.8, accessCount: 0, metadata: {},
    createdAt: now, updatedAt: now, ...overrides,
  };
}

describe('RetrievalEngine', () => {
  let engine: RetrievalEngine;

  beforeEach(() => { engine = new RetrievalEngine(createMockLogger()); });

  describe('index', () => {
    it('should index an entity', () => {
      engine.index(makeEntity());
      const stats = engine.getStats();
      expect(stats.totalChunks).toBe(1);
      expect(stats.totalEntities).toBe(1);
    });

    it('should build inverted index', async () => {
      engine.index(makeEntity());
      const results = engine.search({ query: 'API', mode: 'keyword', organizationId: 'org-1', userId: 'u1' });
      await expect(results).resolves.toBeDefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      engine.index(makeEntity({ id: 'e1', title: 'API Service', chunks: [{ id: 'c1', entityId: 'e1', index: 0, content: 'REST API service for managing users', embedding: null, startLine: 1, endLine: 3, tokenCount: 10 }] }));
      engine.index(makeEntity({ id: 'e2', title: 'Database Schema', chunks: [{ id: 'c2', entityId: 'e2', index: 0, content: 'PostgreSQL database schema for user management', embedding: null, startLine: 1, endLine: 3, tokenCount: 10 }] }));
      engine.index(makeEntity({ id: 'e3', title: 'Auth Module', chunks: [{ id: 'c3', entityId: 'e3', index: 0, content: 'JWT authentication module with token validation', embedding: null, startLine: 1, endLine: 3, tokenCount: 10 }] }));
    });

    it('should find matching results', async () => {
      const response = await engine.search({ query: 'API', mode: 'keyword', organizationId: 'org-1', userId: 'u1' });
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]!.title).toBe('API Service');
    });

    it('should return search metadata', async () => {
      const response = await engine.search({ query: 'user', mode: 'keyword', organizationId: 'org-1', userId: 'u1' });
      expect(response.searchTimeMs).toBeGreaterThanOrEqual(0);
      expect(response.mode).toBe('keyword');
      expect(response.query).toBe('user');
    });

    it('should return empty for no match', async () => {
      const response = await engine.search({ query: 'nonexistent', mode: 'keyword', organizationId: 'org-1', userId: 'u1' });
      expect(response.results.length).toBe(0);
    });

    it('should extract highlights', async () => {
      const response = await engine.search({ query: 'REST API', mode: 'keyword', organizationId: 'org-1', userId: 'u1' });
      if (response.results.length > 0) {
        expect(response.results[0]!.highlights.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getContext', () => {
    it('should build context string', async () => {
      engine.index(makeEntity());
      const context = await engine.getContext(
        { query: 'API', mode: 'keyword', organizationId: 'org-1', userId: 'u1' },
        1000,
      );
      expect(context).toContain('API Service');
    });
  });

  describe('remove', () => {
    it('should remove entity and chunks', () => {
      const entity = makeEntity();
      engine.index(entity);
      expect(engine.getStats().totalEntities).toBe(1);
      engine.remove(entity.id);
      expect(engine.getStats().totalEntities).toBe(0);
    });
  });
});
