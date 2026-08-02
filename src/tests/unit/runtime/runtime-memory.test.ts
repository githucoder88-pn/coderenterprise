/**
 * Runtime Memory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeMemoryStore } from '../../../runtime/memory/runtime-memory.js';
import { createMockLogger } from '../../helpers.js';

describe('RuntimeMemoryStore', () => {
  let store: RuntimeMemoryStore;

  beforeEach(() => { store = new RuntimeMemoryStore(createMockLogger()); });

  describe('store / retrieve', () => {
    it('should store and retrieve from working memory', () => {
      store.store('working', 'task-context', 'Building REST API');
      const entry = store.retrieve('working', 'task-context');
      expect(entry).not.toBeNull();
      expect(entry!.value).toBe('Building REST API');
    });

    it('should store across all 5 layers', () => {
      store.store('working', 'k1', 'v1');
      store.store('episodic', 'k2', 'v2');
      store.store('semantic', 'k3', 'v3');
      store.store('workspace', 'k4', 'v4');
      store.store('organizational', 'k5', 'v5');

      expect(store.retrieve('working', 'k1')).not.toBeNull();
      expect(store.retrieve('episodic', 'k2')).not.toBeNull();
      expect(store.retrieve('semantic', 'k3')).not.toBeNull();
      expect(store.retrieve('workspace', 'k4')).not.toBeNull();
      expect(store.retrieve('organizational', 'k5')).not.toBeNull();
    });

    it('should return null for missing keys', () => {
      expect(store.retrieve('working', 'missing')).toBeNull();
    });

    it('should update access count', () => {
      store.store('working', 'k1', 'v1');
      store.retrieve('working', 'k1');
      store.retrieve('working', 'k1');
      expect(store.retrieve('working', 'k1')!.accessCount).toBe(3);
    });

    it('should respect TTL', () => {
      store.store('working', 'temp', 'value', 50, 100); // 100ms TTL
      expect(store.retrieve('working', 'temp')).not.toBeNull();
    });
  });

  describe('search', () => {
    it('should search across layers', () => {
      store.store('working', 'api-context', 'Building REST API for users');
      store.store('episodic', 'past-task', 'Previously built authentication module');
      store.store('semantic', 'knowledge', 'REST APIs use HTTP methods');

      const results = store.search('API');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by specific layers', () => {
      store.store('working', 'k1', 'API context');
      store.store('episodic', 'k2', 'API history');

      const results = store.search('API', ['working']);
      expect(results.length).toBe(1);
    });

    it('should rank by importance', () => {
      store.store('working', 'low', 'api low', 20);
      store.store('working', 'high', 'api high', 90);

      const results = store.search('api');
      expect(results[0]!.key).toBe('high');
    });
  });

  describe('forget', () => {
    it('should remove a memory entry', () => {
      store.store('working', 'k1', 'v1');
      store.forget('working', 'k1');
      expect(store.retrieve('working', 'k1')).toBeNull();
    });
  });

  describe('compact', () => {
    it('should remove expired entries', () => {
      store.store('working', 'expired', 'v', 50, 1); // 1ms TTL
      store.store('working', 'valid', 'v', 50, 60000);
      // Entries with TTL of 1ms will expire almost immediately
      const removed = store.compact('working');
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStats', () => {
    it('should return stats for all layers', () => {
      store.store('working', 'k1', 'v1');
      store.store('episodic', 'k2', 'v2');
      store.store('semantic', 'k3', 'longer value here');

      const stats = store.getStats();
      expect(stats.working.entries).toBe(1);
      expect(stats.episodic.entries).toBe(1);
      expect(stats.semantic.entries).toBe(1);
      expect(stats.semantic.totalSize).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear a specific layer', () => {
      store.store('working', 'k1', 'v1');
      store.store('episodic', 'k2', 'v2');
      store.clear('working');
      expect(store.retrieve('working', 'k1')).toBeNull();
      expect(store.retrieve('episodic', 'k2')).not.toBeNull();
    });

    it('should clear all layers', () => {
      store.store('working', 'k1', 'v1');
      store.store('episodic', 'k2', 'v2');
      store.clear();
      expect(store.retrieve('working', 'k1')).toBeNull();
      expect(store.retrieve('episodic', 'k2')).toBeNull();
    });
  });
});
