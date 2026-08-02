/**
 * Distributed Memory
 *
 * Multi-scope memory system for agents across regions.
 */

import type { MemoryEntry, MemoryScope, DistributedMemory, RegionId } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IDistributedMemory {
  store(agentId: string, key: string, value: string, scope: MemoryScope, regionId: RegionId, ttl?: number): Promise<void>;
  retrieve(agentId: string, key: string, scope: MemoryScope): Promise<MemoryEntry | null>;
  retrieveAll(agentId: string, scope: MemoryScope): Promise<readonly MemoryEntry[]>;
  delete(agentId: string, key: string, scope: MemoryScope): Promise<void>;
  getMemory(agentId: string): DistributedMemory;
  sync(agentId: string): Promise<void>;
  compact(agentId: string): Promise<number>;
  getStats(agentId: string): { entries: number; byScope: Record<string, number>; syncStatus: string };
}

export class DistributedMemoryStore implements IDistributedMemory {
  private readonly memories = new Map<string, Map<string, MemoryEntry>>();

  constructor(private readonly logger: ILogger) {}

  async store(agentId: string, key: string, value: string, scope: MemoryScope, regionId: RegionId, ttl?: number): Promise<void> {
    const memKey = `${agentId}:${scope}`;
    if (!this.memories.has(memKey)) this.memories.set(memKey, new Map());

    const existing = this.memories.get(memKey)!.get(key);
    const version = (existing?.version ?? 0) + 1;

    const entry: MemoryEntry = {
      key, value, scope, regionId, version,
      timestamp: new Date(), ttl: ttl ?? null,
    };

    this.memories.get(memKey)!.set(key, entry);
    this.logger.debug({ agentId, key, scope, version }, 'Memory stored');
  }

  async retrieve(agentId: string, key: string, scope: MemoryScope): Promise<MemoryEntry | null> {
    const entry = this.memories.get(`${agentId}:${scope}`)?.get(key);
    if (!entry) return null;
    if (entry.ttl && Date.now() - entry.timestamp.getTime() > entry.ttl * 1000) {
      this.memories.get(`${agentId}:${scope}`)?.delete(key);
      return null;
    }
    return entry;
  }

  async retrieveAll(agentId: string, scope: MemoryScope): Promise<readonly MemoryEntry[]> {
    const entries = this.memories.get(`${agentId}:${scope}`);
    if (!entries) return [];
    const now = Date.now();
    return [...entries.values()].filter((e) => !e.ttl || now - e.timestamp.getTime() <= e.ttl * 1000);
  }

  async delete(agentId: string, key: string, scope: MemoryScope): Promise<void> {
    this.memories.get(`${agentId}:${scope}`)?.delete(key);
  }

  getMemory(agentId: string): DistributedMemory {
    const allEntries: MemoryEntry[] = [];
    for (const [key, entries] of this.memories) {
      if (key.startsWith(agentId)) allEntries.push(...entries.values());
    }
    return {
      agentId, scope: 'shared', entries: allEntries,
      syncStatus: 'synced', lastSyncedAt: new Date(),
    };
  }

  async sync(agentId: string): Promise<void> {
    // In production: cross-region memory synchronization via message bus
    this.logger.debug({ agentId }, 'Memory synced');
  }

  async compact(agentId: string): Promise<number> {
    let compacted = 0;
    for (const [key, entries] of this.memories) {
      if (!key.startsWith(agentId)) continue;
      const now = Date.now();
      for (const [entryKey, entry] of entries) {
        if (entry.ttl && now - entry.timestamp.getTime() > entry.ttl * 1000) {
          entries.delete(entryKey);
          compacted++;
        }
      }
    }
    return compacted;
  }

  getStats(agentId: string): { entries: number; byScope: Record<string, number>; syncStatus: string } {
    let entries = 0;
    const byScope: Record<string, number> = {};
    for (const [key, mem] of this.memories) {
      if (key.startsWith(agentId)) {
        const scope = key.split(':')[1] ?? 'unknown';
        byScope[scope] = (byScope[scope] ?? 0) + mem.size;
        entries += mem.size;
      }
    }
    return { entries, byScope, syncStatus: 'synced' };
  }
}
