/**
 * Memory Manager — 7-layer memory system
 *
 * Manages memory across working, session, conversation, semantic,
 * workspace, organizational, and global layers.
 */

import type { MemoryEntry, MemoryLayer } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

interface LayerConfig {
  readonly maxEntries: number;
  readonly defaultTtlMs: number | null;
  readonly autoSummarize: boolean;
}

const LAYER_CONFIGS: Record<MemoryLayer, LayerConfig> = {
  working: { maxEntries: 50, defaultTtlMs: 3_600_000, autoSummarize: false },
  session: { maxEntries: 200, defaultTtlMs: 86_400_000, autoSummarize: false },
  conversation: { maxEntries: 1_000, defaultTtlMs: 7 * 86_400_000, autoSummarize: true },
  semantic: { maxEntries: 100_000, defaultTtlMs: null, autoSummarize: true },
  workspace: { maxEntries: 10_000, defaultTtlMs: 30 * 86_400_000, autoSummarize: false },
  organizational: { maxEntries: 50_000, defaultTtlMs: null, autoSummarize: true },
  global: { maxEntries: 500_000, defaultTtlMs: null, autoSummarize: true },
};

export interface IMemoryManager {
  store(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessedAt'>): Promise<MemoryEntry>;
  retrieve(layer: MemoryLayer, key: string, userId: string): Promise<MemoryEntry | null>;
  search(query: string, userId: string, orgId: string, layers?: readonly MemoryLayer[], limit?: number): Promise<readonly MemoryEntry[]>;
  forget(layer: MemoryLayer, key: string, userId: string): Promise<void>;
  consolidate(userId: string, orgId: string): Promise<{ consolidated: number; summarized: number }>;
  getRelevantContext(userId: string, orgId: string, query: string, maxTokens: number): Promise<string>;
  getStats(userId: string, orgId: string): Promise<Record<MemoryLayer, { entries: number; tokens: number }>>;
  compact(layer: MemoryLayer): Promise<number>;
  clear(layer?: MemoryLayer): void;
}

export class MemoryManager implements IMemoryManager {
  private readonly stores = new Map<string, Map<string, MemoryEntry>>();

  constructor(
    private readonly logger: ILogger,
  ) {}

  async store(input: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessedAt'>): Promise<MemoryEntry> {
    const config = LAYER_CONFIGS[input.layer];
    const storeKey = `${input.userId}:${input.organizationId}:${input.layer}`;
    if (!this.stores.has(storeKey)) this.stores.set(storeKey, new Map());
    const store = this.stores.get(storeKey)!;

    // Evict if at capacity
    if (store.size >= config.maxEntries) {
      const entries = [...store.values()].sort((a, b) => a.importance - b.importance);
      for (let i = 0; i < Math.floor(config.maxEntries * 0.1); i++) {
        store.delete(entries[i]!.key);
      }
    }

    const now = new Date();
    const existing = store.get(input.key);
    const entry: MemoryEntry = {
      ...input, id: crypto.randomUUID(),
      summary: input.summary ?? null,
      embedding: input.embedding ?? null,
      accessCount: (existing?.accessCount ?? 0) + 1,
      lastAccessedAt: now,
      expiresAt: input.expiresAt ?? (config.defaultTtlMs ? new Date(now.getTime() + config.defaultTtlMs) : null),
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };

    store.set(input.key, entry);
    this.logger.debug({ layer: input.layer, key: input.key, userId: input.userId }, 'Memory stored');
    return entry;
  }

  async retrieve(layer: MemoryLayer, key: string, userId: string): Promise<MemoryEntry | null> {
    for (const [storeKey, store] of this.stores) {
      if (!storeKey.startsWith(userId)) continue;
      if (!storeKey.includes(`:${layer}`)) continue;
      const entry = store.get(key);
      if (!entry) continue;
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        store.delete(key);
        return null;
      }
      const updated = { ...entry, accessCount: entry.accessCount + 1, lastAccessedAt: new Date() };
      store.set(key, updated);
      return updated;
    }
    return null;
  }

  async search(query: string, userId: string, orgId: string, layers?: readonly MemoryLayer[], limit = 20): Promise<readonly MemoryEntry[]> {
    const q = query.toLowerCase();
    const results: MemoryEntry[] = [];
    const searchLayers = layers ?? (Object.keys(LAYER_CONFIGS) as MemoryLayer[]);

    for (const [storeKey, store] of this.stores) {
      if (!storeKey.startsWith(userId) && !storeKey.includes(orgId)) continue;
      const layer = storeKey.split(':')[2] as MemoryLayer;
      if (!searchLayers.includes(layer)) continue;

      for (const entry of store.values()) {
        if (entry.expiresAt && entry.expiresAt < new Date()) continue;
        if (
          entry.value.toLowerCase().includes(q) ||
          entry.key.toLowerCase().includes(q) ||
          entry.tags.some((t) => t.toLowerCase().includes(q)) ||
          entry.summary?.toLowerCase().includes(q)
        ) {
          results.push(entry);
        }
      }
    }

    return results
      .sort((a, b) => {
        const textMatch = (e: MemoryEntry) => e.value.toLowerCase().includes(q) ? 2 : e.key.toLowerCase().includes(q) ? 1 : 0;
        return textMatch(b) - textMatch(a) || b.importance - a.importance;
      })
      .slice(0, limit);
  }

  async forget(layer: MemoryLayer, key: string, userId: string): Promise<void> {
    for (const [storeKey, store] of this.stores) {
      if (storeKey.startsWith(userId) && storeKey.includes(`:${layer}`)) {
        store.delete(key);
      }
    }
  }

  async consolidate(userId: string, _orgId: string): Promise<{ consolidated: number; summarized: number }> {
    let consolidated = 0, summarized = 0;

    // Move high-importance short-term to long-term
    for (const [storeKey, store] of this.stores) {
      if (!storeKey.startsWith(userId)) continue;
      const layer = storeKey.split(':')[2] as MemoryLayer;
      if (layer !== 'working' && layer !== 'session') continue;

      for (const [key, entry] of store) {
        if (entry.importance >= 70) {
          await this.store({ ...entry, layer: 'semantic', key: `consolidated:${key}` });
          consolidated++;
        }
      }
    }

    return { consolidated, summarized };
  }

  async getRelevantContext(userId: string, orgId: string, query: string, maxTokens: number): Promise<string> {
    const results = await this.search(query, userId, orgId, undefined, 50);
    const parts: string[] = [];
    let tokens = 0;

    for (const entry of results) {
      const text = entry.summary ?? entry.value;
      const entryTokens = Math.ceil(text.length / 4);
      if (tokens + entryTokens > maxTokens) break;
      parts.push(`[${entry.layer}] ${text}`);
      tokens += entryTokens;
    }

    return parts.join('\n\n');
  }

  async getStats(userId: string, _orgId: string): Promise<Record<MemoryLayer, { entries: number; tokens: number }>> {
    const stats = {} as Record<MemoryLayer, { entries: number; tokens: number }>;
    for (const layer of Object.keys(LAYER_CONFIGS) as MemoryLayer[]) {
      stats[layer] = { entries: 0, tokens: 0 };
    }

    for (const [storeKey, store] of this.stores) {
      if (!storeKey.startsWith(userId)) continue;
      const layer = storeKey.split(':')[2] as MemoryLayer;
      if (!stats[layer]) continue;
      for (const entry of store.values()) {
        stats[layer].entries++;
        stats[layer].tokens += Math.ceil(entry.value.length / 4);
      }
    }

    return stats;
  }

  async compact(layer: MemoryLayer): Promise<number> {
    let compacted = 0;
    const now = Date.now();
    for (const [storeKey, store] of this.stores) {
      if (!storeKey.includes(`:${layer}`)) continue;
      for (const [key, entry] of store) {
        if (entry.expiresAt && entry.expiresAt.getTime() < now) {
          store.delete(key);
          compacted++;
        }
      }
    }
    return compacted;
  }

  clear(layer?: MemoryLayer): void {
    for (const [key, store] of this.stores) {
      if (!layer || key.includes(`:${layer}`)) store.clear();
    }
  }
}
