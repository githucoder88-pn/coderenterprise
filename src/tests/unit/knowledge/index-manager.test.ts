/**
 * Index Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IndexManager } from '../../../knowledge/indexing/index-manager.js';
import { RetrievalEngine } from '../../../knowledge/retrieval/retrieval-engine.js';
import { createMockLogger } from '../../helpers.js';

describe('IndexManager', () => {
  let indexer: IndexManager;
  let retrieval: RetrievalEngine;

  beforeEach(() => {
    retrieval = new RetrievalEngine(createMockLogger());
    indexer = new IndexManager(retrieval, createMockLogger(), 512, 64);
  });

  describe('ingest', () => {
    it('should ingest content and create chunks', async () => {
      const result = await indexer.ingest({
        source: 'repository', sourceId: 'repo-1', organizationId: 'org-1',
        content: 'function hello() { return "world"; }',
        title: 'Hello Module',
      });
      expect(result.entityId).toBeDefined();
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it('should ingest large documents', async () => {
      const content = 'word '.repeat(5000);
      const result = await indexer.ingest({
        source: 'document', sourceId: 'doc-1', organizationId: 'org-1',
        content, title: 'Large Document',
      });
      expect(result.chunksCreated).toBeGreaterThan(1);
    });

    it('should assign quality score', async () => {
      const result = await indexer.ingest({
        source: 'repository', sourceId: 'r1', organizationId: 'org-1',
        content: 'export function test() { return true; }',
        title: 'Test',
      });
      const stats = indexer.getStats('org-1');
      expect(stats.averageQuality).toBeGreaterThan(0);
    });
  });

  describe('remove', () => {
    it('should remove entity from index', async () => {
      const result = await indexer.ingest({
        source: 'repository', sourceId: 'r1', organizationId: 'org-1',
        content: 'test content', title: 'Test',
      });
      expect(indexer.getStats('org-1').totalEntities).toBe(1);
      await indexer.remove(result.entityId);
      expect(indexer.getStats('org-1').totalEntities).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', async () => {
      await indexer.ingest({ source: 'repository', sourceId: 'r1', organizationId: 'org-1', content: 'A', title: 'A' });
      await indexer.ingest({ source: 'document', sourceId: 'd1', organizationId: 'org-1', content: 'B', title: 'B' });
      const stats = indexer.getStats('org-1');
      expect(stats.totalEntities).toBe(2);
      expect(stats.bySource['repository']).toBe(1);
      expect(stats.bySource['document']).toBe(1);
    });
  });

  describe('listEntities', () => {
    it('should list entities by org', async () => {
      await indexer.ingest({ source: 'repository', sourceId: 'r1', organizationId: 'org-1', content: 'A', title: 'A' });
      await indexer.ingest({ source: 'document', sourceId: 'd1', organizationId: 'org-2', content: 'B', title: 'B' });
      expect(indexer.listEntities('org-1').length).toBe(1);
    });

    it('should filter by source', async () => {
      await indexer.ingest({ source: 'repository', sourceId: 'r1', organizationId: 'org-1', content: 'A', title: 'A' });
      await indexer.ingest({ source: 'document', sourceId: 'd1', organizationId: 'org-1', content: 'B', title: 'B' });
      expect(indexer.listEntities('org-1', 'repository').length).toBe(1);
    });
  });
});
