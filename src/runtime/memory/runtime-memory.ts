/**
 * Runtime Memory — 5-layer memory system
 *
 * Working: current task context (in-process, ephemeral)
 * Episodic: past interaction memories (persistent)
 * Semantic: knowledge-based memories (vector-searchable)
 * Workspace: file/code context (indexed)
 * Organizational: org-wide knowledge (shared)
 */

import type { MemoryLayer, RuntimeMemory, MemoryEntry } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IRuntimeMemoryStore {
  store(layer: MemoryLayer, key: string, value: string, importance?: number, ttlMs?: number): void;
  retrieve(layer: MemoryLayer, key: string): MemoryEntry | null;
  retrieveAll(layer: MemoryLayer): readonly MemoryEntry[];
  search(query: string, layers?: readonly MemoryLayer[]): readonly MemoryEntry[];
  forget(layer: MemoryLayer, key: string): void;
  compact(layer: MemoryLayer): number;
  getStats(): Record<MemoryLayer, { entries: number; totalSize: number }>;
  clear(layer?: MemoryLayer): void;
}

export class RuntimeMemoryStore implements IRuntimeMemoryStore {
  private readonly memories = new Map<MemoryLayer, Map<string, MemoryEntry>>();
  private readonly layerConfig: Record<MemoryLayer, { maxEntries: number; ttlMs: number | null }> = {
    working: { maxEntries: 100, ttlMs: 3_600_000 },
    episodic: { maxEntries: 10_000, ttlMs: 30 * 86_400_000 },
    semantic: { maxEntries: 50_000, ttlMs: null },
    workspace: { maxEntries: 5_000, ttlMs: 7 * 86_400_000 },
    organizational: { maxEntries: 100_000, ttlMs: null },
  };

  constructor(private readonly logger: ILogger) {
    for (const layer of Object.keys(this.layerConfig) as MemoryLayer[]) {
      this.memories.set(layer, new Map());
    }
  }

  store(layer: MemoryLayer, key: string, value: string, importance = 50, ttlMs?: number): void {
    const store = this.memories.get(layer)!;
    const config = this.layerConfig[layer];

    // Evict if at capacity
    if (store.size >= config.maxEntries) {
      const entries = [...store.values()].sort((a, b) => a.importance - b.importance);
      const toEvict = entries.slice(0, Math.floor(config.maxEntries * 0.1));
      for (const e of toEvict) store.delete(e.key);
    }

    const now = new Date();
    const existing = store.get(key);
    store.set(key, {
      key, value, importance,
      accessCount: (existing?.accessCount ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      lastAccessedAt: now,
      expiresAt: ttlMs ? new Date(now.getTime() + ttlMs) : config.ttlMs ? new Date(now.getTime() + config.ttlMs) : null,
    });
  }

  retrieve(layer: MemoryLayer, key: string): MemoryEntry | null {
    const entry = this.memories.get(layer)?.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.memories.get(layer)?.delete(key);
      return null;
    }
    // Update access count
    this.memories.get(layer)!.set(key, { ...entry, accessCount: entry.accessCount + 1, lastAccessedAt: new Date() });
    return entry;
  }

  retrieveAll(layer: MemoryLayer): readonly MemoryEntry[] {
    const now = Date.now();
    return [...(this.memories.get(layer)?.values() ?? [])].filter((e) => !e.expiresAt || e.expiresAt.getTime() > now);
  }

  search(query: string, layers?: readonly MemoryLayer[]): readonly MemoryEntry[] {
    const q = query.toLowerCase();
    const searchLayers = layers ?? (Object.keys(this.layerConfig) as MemoryLayer[]);
    const results: MemoryEntry[] = [];

    for (const layer of searchLayers) {
      for (const entry of this.retrieveAll(layer)) {
        if (entry.value.toLowerCase().includes(q) || entry.key.toLowerCase().includes(q)) {
          results.push(entry);
        }
      }
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  forget(layer: MemoryLayer, key: string): void {
    this.memories.get(layer)?.delete(key);
  }

  compact(layer: MemoryLayer): number {
    const store = this.memories.get(layer);
    if (!store) return 0;
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of store) {
      if (entry.expiresAt && entry.expiresAt.getTime() < now) {
        store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  getStats(): Record<MemoryLayer, { entries: number; totalSize: number }> {
    const stats = {} as Record<MemoryLayer, { entries: number; totalSize: number }>;
    for (const [layer, store] of this.memories) {
      let totalSize = 0;
      for (const entry of store.values()) totalSize += entry.value.length;
      stats[layer] = { entries: store.size, totalSize };
    }
    return stats;
  }

  clear(layer?: MemoryLayer): void {
    if (layer) {
      this.memories.get(layer)?.clear();
    } else {
      for (const store of this.memories.values()) store.clear();
    }
  }
}
