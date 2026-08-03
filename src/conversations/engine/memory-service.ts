/**
 * Memory Service
 *
 * Manages short-term, long-term, episodic, and semantic memory
 * for conversation context and personalization.
 */

import type { MemoryEntry, MemoryQuery, MemoryType } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';

interface EmbeddingProvider {
  embed(text: string): Promise<readonly number[]>;
}

export interface IMemoryService {
  store(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessedAt' | 'embedding'>): Promise<MemoryEntry>;
  retrieve(query: MemoryQuery): Promise<readonly MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, updates: Partial<Pick<MemoryEntry, 'content' | 'importance' | 'tags' | 'summary'>>): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;
  consolidate(userId: string): Promise<number>; // Merge/simplify short-term → long-term
  getRelevantContext(userId: string, orgId: string, query: string, maxTokens: number): Promise<string>;
  getStats(userId: string): Promise<{ total: number; byType: Record<MemoryType, number>; totalTokens: number }>;
}

export class MemoryService implements IMemoryService {
  private readonly memories = new Map<string, MemoryEntry>();
  private readonly embeddingCache = new Map<string, readonly number[]>();

  constructor(
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
    private readonly embeddingProvider?: EmbeddingProvider,
  ) {}

  async store(
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessedAt' | 'embedding'>,
  ): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const now = new Date();

    let embedding: readonly number[] | null = null;
    if (this.embeddingProvider) {
      try {
        embedding = await this.embeddingProvider.embed(entry.content);
        this.embeddingCache.set(id, embedding);
      } catch (error) {
        this.logger.warn({ id, error }, 'Failed to generate memory embedding');
      }
    }

    const memory: MemoryEntry = {
      ...entry, id, embedding, accessCount: 0, lastAccessedAt: null,
      createdAt: now, updatedAt: now,
    };

    this.memories.set(id, memory);
    await this.cache.del(`memory:user:${entry.userId}`);

    this.logger.debug({ id, type: entry.type, importance: entry.importance }, 'Memory stored');
    return memory;
  }

  async retrieve(query: MemoryQuery): Promise<readonly MemoryEntry[]> {
    let results = [...this.memories.values()].filter(
      (m) => m.userId === query.userId && m.organizationId === query.organizationId,
    );

    if (query.type) results = results.filter((m) => m.type === query.type);
    const minImportance = query.minImportance;
    if (minImportance !== undefined) results = results.filter((m) => m.importance >= minImportance);
    if (query.tags?.length) results = results.filter((m) => query.tags!.some((t) => m.tags.includes(t)));

    // Filter expired
    results = results.filter((m) => !m.expiresAt || m.expiresAt > new Date());

    // Sort by relevance: if we have embeddings, use similarity; otherwise importance
    if (this.embeddingProvider && query.query) {
      const queryEmbedding = await this.embeddingProvider.embed(query.query);
      results = results
        .filter((m) => m.embedding)
        .map((m) => ({
          memory: m,
          similarity: this.cosineSimilarity(queryEmbedding, m.embedding!),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .map((r) => r.memory);
    } else {
      results.sort((a, b) => {
        const impDiff = b.importance - a.importance;
        if (impDiff !== 0) return impDiff;
        return b.accessCount - a.accessCount;
      });
    }

    const maxResults = query.maxResults ?? 20;
    const sliced = results.slice(0, maxResults);

    // Update access counts
    for (const m of sliced) {
      const updated = { ...m, accessCount: m.accessCount + 1, lastAccessedAt: new Date() };
      this.memories.set(m.id, updated);
    }

    return sliced;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.memories.get(id) ?? null;
  }

  async update(id: string, updates: Partial<Pick<MemoryEntry, 'content' | 'importance' | 'tags' | 'summary'>>): Promise<MemoryEntry> {
    const memory = this.memories.get(id);
    if (!memory) throw new Error('Memory not found');

    const updated = { ...memory, ...updates, updatedAt: new Date() };
    this.memories.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
    this.embeddingCache.delete(id);
  }

  async consolidate(userId: string): Promise<number> {
    // Move important short-term memories to long-term
    const shortTerm = [...this.memories.values()].filter(
      (m) => m.userId === userId && m.type === 'short_term' && m.importance >= 60,
    );

    let consolidated = 0;
    for (const memory of shortTerm) {
      const { id: _id, createdAt: _ca, updatedAt: _ua, accessCount: _ac, lastAccessedAt: _la, embedding: _emb, ...rest } = memory;
      await this.store({ ...rest, type: 'long_term' });
      await this.delete(memory.id);
      consolidated++;
    }

    this.logger.info({ userId, consolidated }, 'Memory consolidated');
    return consolidated;
  }

  async getRelevantContext(userId: string, orgId: string, query: string, maxTokens: number): Promise<string> {
    const memories = await this.retrieve({ userId, organizationId: orgId, query, maxResults: 50 });
    const contextParts: string[] = [];
    let tokenEstimate = 0;

    for (const memory of memories) {
      const text = memory.summary ?? memory.content;
      const tokens = Math.ceil(text.length / 4);
      if (tokenEstimate + tokens > maxTokens) break;
      contextParts.push(`[${memory.type}] ${text}`);
      tokenEstimate += tokens;
    }

    return contextParts.join('\n\n');
  }

  async getStats(userId: string): Promise<{ total: number; byType: Record<MemoryType, number>; totalTokens: number }> {
    const userMemories = [...this.memories.values()].filter((m) => m.userId === userId);
    const byType: Record<MemoryType, number> = { short_term: 0, long_term: 0, episodic: 0, semantic: 0 };
    let totalTokens = 0;

    for (const m of userMemories) {
      byType[m.type]++;
      totalTokens += Math.ceil(m.content.length / 4);
    }

    return { total: userMemories.length, byType, totalTokens };
  }

  private cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
