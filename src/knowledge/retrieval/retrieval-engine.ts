/**
 * Retrieval Engine
 *
 * Multi-mode retrieval pipeline: query → embedding → candidate selection → ranking → reranking → context.
 */

import type {
  RetrievalQuery, RetrievalResult, RetrievalResponse, RankedResult,
  RankingSignal, KnowledgeEntity, KnowledgeChunk, SearchMode,
} from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

interface IndexedChunk {
  readonly entityId: string;
  readonly chunkId: string;
  readonly title: string;
  readonly content: string;
  readonly summary: string | null;
  readonly embedding: readonly number[] | null;
  readonly source: string;
  readonly tokens: readonly string[];
  readonly quality: number;
  readonly metadata: Record<string, unknown>;
}

export interface IRetrievalEngine {
  index(entity: KnowledgeEntity): void;
  remove(entityId: string): void;
  search(query: RetrievalQuery): Promise<RetrievalResponse>;
  getContext(query: RetrievalQuery, maxTokens: number): Promise<string>;
  getStats(): { totalChunks: number; totalEntities: number; avgChunkSize: number };
}

export class RetrievalEngine implements IRetrievalEngine {
  private readonly chunks = new Map<string, IndexedChunk>();
  private readonly entities = new Map<string, KnowledgeEntity>();
  private readonly invertedIndex = new Map<string, Set<string>>();

  constructor(private readonly logger: ILogger) {}

  index(entity: KnowledgeEntity): void {
    this.entities.set(entity.id, entity);

    for (const chunk of entity.chunks) {
      const indexed: IndexedChunk = {
        entityId: entity.id, chunkId: chunk.id, title: entity.title,
        content: chunk.content, summary: entity.summary,
        embedding: chunk.embedding ?? entity.embedding,
        source: entity.source, tokens: this.tokenize(chunk.content),
        quality: entity.quality, metadata: entity.metadata,
      };

      this.chunks.set(chunk.id, indexed);

      // Build inverted index
      for (const token of indexed.tokens) {
        if (!this.invertedIndex.has(token)) this.invertedIndex.set(token, new Set());
        this.invertedIndex.get(token)!.add(chunk.id);
      }
    }
  }

  remove(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    for (const chunk of entity.chunks) {
      const indexed = this.chunks.get(chunk.id);
      if (indexed) {
        for (const token of indexed.tokens) {
          this.invertedIndex.get(token)?.delete(chunk.id);
        }
      }
      this.chunks.delete(chunk.id);
    }
    this.entities.delete(entityId);
  }

  async search(query: RetrievalQuery): Promise<RetrievalResponse> {
    const start = performance.now();
    const maxResults = query.maxResults ?? 20;
    const minScore = query.minScore ?? 0.3;

    let candidates: IndexedChunk[];

    switch (query.mode) {
      case 'keyword':
        candidates = this.keywordSearch(query.query);
        break;
      case 'semantic':
        candidates = this.semanticSearch(query);
        break;
      case 'vector':
        candidates = this.vectorSearch(query);
        break;
      case 'hybrid':
      default:
        candidates = this.hybridSearch(query);
        break;
    }

    // Apply filters
    candidates = this.applyFilters(candidates, query);

    // Rank results
    const ranked = this.rank(candidates, query);

    // Rerank top results
    const reranked = this.rerank(ranked.slice(0, maxResults * 2), query);

    // Build response
    const results: RetrievalResult[] = reranked
      .filter((r) => r.finalScore >= minScore)
      .slice(0, maxResults)
      .map((r) => ({
        id: r.result.id,
        entityId: r.result.entityId,
        chunkId: r.result.chunkId,
        title: r.result.title,
        content: r.result.content,
        summary: r.result.summary,
        score: r.finalScore,
        source: r.result.source as any,
        highlights: this.extractHighlights(r.result.content, query.query),
        metadata: r.result.metadata,
      }));

    const context = results.map((r) => `[${r.source}] ${r.title}: ${r.content}`).join('\n\n');

    return {
      results,
      totalMatches: results.length,
      searchTimeMs: performance.now() - start,
      mode: query.mode,
      query: query.query,
      context,
    };
  }

  async getContext(query: RetrievalQuery, maxTokens: number): Promise<string> {
    const response = await this.search({ ...query, maxResults: 50 });
    const parts: string[] = [];
    let tokens = 0;

    for (const result of response.results) {
      const text = result.summary ?? result.content;
      const entryTokens = Math.ceil(text.length / 4);
      if (tokens + entryTokens > maxTokens) break;
      parts.push(`[${result.source}] ${result.title}: ${text}`);
      tokens += entryTokens;
    }

    return parts.join('\n\n');
  }

  getStats(): { totalChunks: number; totalEntities: number; avgChunkSize: number } {
    const totalChunks = this.chunks.size;
    const totalSize = [...this.chunks.values()].reduce((sum, c) => sum + c.content.length, 0);
    return {
      totalChunks,
      totalEntities: this.entities.size,
      avgChunkSize: totalChunks > 0 ? totalSize / totalChunks : 0,
    };
  }

  // ─── Search Modes ───────────────────────────────────────────────────────

  private keywordSearch(query: string): IndexedChunk[] {
    const tokens = this.tokenize(query.toLowerCase());
    const matchingIds = new Set<string>();

    for (const token of tokens) {
      const ids = this.invertedIndex.get(token);
      if (ids) {
        for (const id of ids) matchingIds.add(id);
      }
    }

    return [...matchingIds].map((id) => this.chunks.get(id)!).filter(Boolean);
  }

  private semanticSearch(query: RetrievalQuery): IndexedChunk[] {
    // If we had a query embedding, we'd compute cosine similarity
    // For now, fall back to keyword + quality scoring
    return this.keywordSearch(query.query);
  }

  private vectorSearch(query: RetrievalQuery): IndexedChunk[] {
    // Vector search requires an embedding for the query
    // Fall back to keyword search for now
    return this.keywordSearch(query.query);
  }

  private hybridSearch(query: RetrievalQuery): IndexedChunk[] {
    const keywordResults = this.keywordSearch(query.query);
    // In production: merge with semantic results using RRF
    return keywordResults;
  }

  // ─── Ranking ────────────────────────────────────────────────────────────

  private rank(chunks: readonly IndexedChunk[], query: RetrievalQuery): RankedResult[] {
    return chunks.map((chunk) => {
      const signals: RankingSignal[] = [
        { name: 'text_relevance', weight: 0.4, value: this.textRelevance(chunk.content, query.query) },
        { name: 'quality', weight: 0.2, value: chunk.quality },
        { name: 'title_match', weight: 0.2, value: chunk.title.toLowerCase().includes(query.query.toLowerCase()) ? 1 : 0 },
        { name: 'source_authority', weight: 0.1, value: this.sourceAuthority(chunk.source) },
        { name: 'freshness', weight: 0.1, value: 0.5 },
      ];

      const finalScore = signals.reduce((sum, s) => sum + s.weight * s.value, 0);

      return {
        result: {
          id: chunk.chunkId, entityId: chunk.entityId, chunkId: chunk.chunkId,
          title: chunk.title, content: chunk.content, summary: chunk.summary,
          score: finalScore, source: chunk.source as any, highlights: [],
          metadata: chunk.metadata,
        },
        signals, finalScore,
      };
    });
  }

  private rerank(ranked: readonly RankedResult[], query: RetrievalQuery): RankedResult[] {
    // Diversity-aware reranking: penalize results from same entity
    const seen = new Map<string, number>();
    return ranked.map((r) => {
      const count = seen.get(r.result.entityId) ?? 0;
      seen.set(r.result.entityId, count + 1);
      const diversityPenalty = count > 0 ? 0.1 * count : 0;
      return { ...r, finalScore: r.finalScore - diversityPenalty };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private applyFilters(chunks: readonly IndexedChunk[], query: RetrievalQuery): IndexedChunk[] {
    let filtered = chunks;
    if (query.filters?.sources?.length) {
      filtered = filtered.filter((c) => query.filters!.sources!.includes(c.source as any));
    }
    if (query.filters?.minQuality) {
      filtered = filtered.filter((c) => c.quality >= query.filters!.minQuality!);
    }
    return filtered;
  }

  private textRelevance(content: string, query: string): number {
    const q = query.toLowerCase();
    const c = content.toLowerCase();
    if (c.includes(q)) return 1;
    const words = q.split(/\s+/);
    const matched = words.filter((w) => c.includes(w)).length;
    return matched / Math.max(1, words.length);
  }

  private sourceAuthority(source: string): number {
    const authorities: Record<string, number> = {
      knowledge_base: 0.9, document: 0.8, repository: 0.7, workspace: 0.6,
      conversation: 0.5, website: 0.4, extension: 0.3, image: 0.2,
    };
    return authorities[source] ?? 0.5;
  }

  private extractHighlights(content: string, query: string): string[] {
    const q = query.toLowerCase();
    const highlights: string[] = [];
    const sentences = content.split(/[.!?\n]+/).filter((s) => s.trim().length > 0);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(q)) {
        highlights.push(sentence.trim().slice(0, 200));
        if (highlights.length >= 3) break;
      }
    }
    return highlights;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/[\s\-_.,;:!?(){}\[\]<>"'`~@#$%^&*+=|\\/]+/).filter((t) => t.length > 1);
  }
}
