/**
 * Distributed Memory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DistributedMemoryStore } from '../../../cluster/coordinator/distributed-memory.js';
import { createMockLogger } from '../../helpers.js';

describe('DistributedMemoryStore', () => {
  let store: DistributedMemoryStore;

  beforeEach(() => { store = new DistributedMemoryStore(createMockLogger()); });

  describe('store / retrieve', () => {
    it('should store and retrieve memory entries', async () => {
      await store.store('agent-1', 'task', 'Build API', 'short_term', 'us-east');
      const entry = await store.retrieve('agent-1', 'task', 'short_term');
      expect(entry).not.toBeNull();
      expect(entry!.value).toBe('Build API');
    });

    it('should return null for missing keys', async () => {
      expect(await store.retrieve('agent-1', 'missing', 'short_term')).toBeNull();
    });

    it('should respect TTL', async () => {
      await store.store('agent-1', 'temp', 'value', 'short_term', 'us-east', 1);
      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 1100));
      const entry = await store.retrieve('agent-1', 'temp', 'short_term');
      expect(entry).toBeNull();
    });

    it('should update version on re-store', async () => {
      await store.store('agent-1', 'key', 'v1', 'short_term', 'us-east');
      await store.store('agent-1', 'key', 'v2', 'short_term', 'us-east');
      const entry = await store.retrieve('agent-1', 'key', 'short_term');
      expect(entry!.version).toBe(2);
      expect(entry!.value).toBe('v2');
    });
  });

  describe('retrieveAll', () => {
    it('should retrieve all entries in a scope', async () => {
      await store.store('agent-1', 'a', '1', 'short_term', 'us-east');
      await store.store('agent-1', 'b', '2', 'short_term', 'us-east');
      await store.store('agent-1', 'c', '3', 'long_term', 'us-east');
      const entries = await store.retrieveAll('agent-1', 'short_term');
      expect(entries.length).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete a memory entry', async () => {
      await store.store('agent-1', 'key', 'value', 'short_term', 'us-east');
      await store.delete('agent-1', 'key', 'short_term');
      expect(await store.retrieve('agent-1', 'key', 'short_term')).toBeNull();
    });
  });

  describe('getMemory', () => {
    it('should return full agent memory', async () => {
      await store.store('agent-1', 'a', '1', 'short_term', 'us-east');
      await store.store('agent-1', 'b', '2', 'long_term', 'eu-west');
      const memory = store.getMemory('agent-1');
      expect(memory.agentId).toBe('agent-1');
      expect(memory.entries.length).toBe(2);
    });
  });

  describe('compact', () => {
    it('should remove expired entries', async () => {
      await store.store('agent-1', 'expired', 'value', 'short_term', 'us-east', 1);
      await store.store('agent-1', 'valid', 'value', 'short_term', 'us-east', 3600);
      await new Promise((r) => setTimeout(r, 1100));
      const compacted = await store.compact('agent-1');
      expect(compacted).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return memory statistics', async () => {
      await store.store('agent-1', 'a', '1', 'short_term', 'us-east');
      await store.store('agent-1', 'b', '2', 'long_term', 'us-east');
      const stats = store.getStats('agent-1');
      expect(stats.entries).toBe(2);
      expect(stats.byScope['short_term']).toBe(1);
    });
  });
});
