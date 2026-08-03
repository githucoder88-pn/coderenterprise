/**
 * Index Manager
 *
 * Manages document ingestion pipeline: parse → chunk → embed → store.
 */

import type {
  KnowledgeEntity, KnowledgeChunk, KnowledgeSource, IngestionRequest, IngestionResult, IndexEntry, IndexStats,
} from '../types.js';
import type { IRetrievalEngine } from '../retrieval/retrieval-engine.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IIndexManager {
  ingest(request: IngestionRequest): Promise<IngestionResult>;
  reindex(entityId: string): Promise<IngestionResult | null>;
  remove(entityId: string): Promise<void>;
  getStats(orgId: string): IndexStats;
  listEntities(orgId: string, source?: KnowledgeSource): readonly KnowledgeEntity[];
}

export class IndexManager implements IIndexManager {
  private readonly entities = new Map<string, KnowledgeEntity>();

  constructor(
    private readonly retrievalEngine: IRetrievalEngine,
    private readonly logger: ILogger,
    private readonly chunkSize = 512,
    private readonly chunkOverlap = 64,
  ) {}

  async ingest(request: IngestionRequest): Promise<IngestionResult> {
    const start = performance.now();
    const entityId = crypto.randomUUID();

    // Parse and chunk
    const chunks = this.chunkContent(request.content, entityId);

    // Create entity
    const now = new Date();
    const entity: KnowledgeEntity = {
      id: entityId, organizationId: request.organizationId,
      source: request.source, sourceId: request.sourceId,
      title: request.title, content: request.content,
      summary: null, embedding: null,
      chunks, tags: request.tags ?? [],
      language: request.language ?? null,
      quality: this.assessQuality(request.content),
      accessCount: 0, metadata: request.metadata ?? {},
      createdAt: now, updatedAt: now,
    };

    this.entities.set(entityId, entity);
    this.retrievalEngine.index(entity);

    this.logger.info({
      entityId, source: request.source, title: request.title,
      chunks: chunks.length, size: request.content.length,
    }, 'Content ingested');

    return {
      entityId, chunksCreated: chunks.length,
      embeddingsGenerated: 0, totalTimeMs: performance.now() - start,
    };
  }

  async reindex(entityId: string): Promise<IngestionResult | null> {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    this.retrievalEngine.remove(entityId);
    this.retrievalEngine.index(entity);
    return { entityId, chunksCreated: entity.chunks.length, embeddingsGenerated: 0, totalTimeMs: 0 };
  }

  async remove(entityId: string): Promise<void> {
    this.retrievalEngine.remove(entityId);
    this.entities.delete(entityId);
  }

  getStats(orgId: string): IndexStats {
    const entities = [...this.entities.values()].filter((e) => e.organizationId === orgId);
    const totalChunks = entities.reduce((sum, e) => sum + e.chunks.length, 0);
    const bySource: Record<string, number> = {};
    let totalQuality = 0;

    for (const e of entities) {
      bySource[e.source] = (bySource[e.source] ?? 0) + 1;
      totalQuality += e.quality;
    }

    return {
      totalEntries: totalChunks,
      totalEntities: entities.length,
      totalChunks,
      bySource,
      averageQuality: entities.length > 0 ? totalQuality / entities.length : 0,
      lastIndexedAt: entities.length > 0 ? new Date(Math.max(...entities.map((e) => e.updatedAt.getTime()))) : null,
    };
  }

  listEntities(orgId: string, source?: KnowledgeSource): readonly KnowledgeEntity[] {
    return [...this.entities.values()].filter(
      (e) => e.organizationId === orgId && (!source || e.source === source),
    );
  }

  // ─── Chunking ───────────────────────────────────────────────────────────

  private chunkContent(content: string, entityId: string): KnowledgeChunk[] {
    const lines = content.split('\n');
    const chunks: KnowledgeChunk[] = [];

    // Try smart chunking by code blocks first
    const blocks = this.splitByBlocks(lines);
    for (const block of blocks) {
      if (block.content.length > 0) {
        chunks.push({
          id: crypto.randomUUID(), entityId, index: chunks.length,
          content: block.content, embedding: null,
          startLine: block.startLine, endLine: block.endLine,
          tokenCount: Math.ceil(block.content.length / 4),
        });
      }
    }

    // Fallback to fixed-size chunking if blocks are too large
    if (chunks.length === 0 || chunks.some(c => c.content.split(/\s+/).length > this.chunkSize)) { chunks.length = 0;
      const words = content.split(/\s+/);
      for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
        const chunkWords = words.slice(i, i + this.chunkSize);
        const chunkContent = chunkWords.join(' ');
        chunks.push({
          id: crypto.randomUUID(), entityId, index: chunks.length,
          content: chunkContent, embedding: null,
          startLine: null, endLine: null,
          tokenCount: Math.ceil(chunkContent.length / 4),
        });
      }
    }

    return chunks;
  }

  private splitByBlocks(lines: readonly string[]): { content: string; startLine: number; endLine: number }[] {
    const blocks: { content: string; startLine: number; endLine: number }[] = [];
    let depth = 0;
    let blockStart = 0;
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (this.isBlockStart(line) && depth === 0) {
        if (inBlock && i > blockStart) {
          blocks.push({ content: lines.slice(blockStart, i).join('\n'), startLine: blockStart + 1, endLine: i });
        }
        blockStart = i;
        inBlock = true;
      }
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (inBlock && depth <= 0 && i > blockStart) {
        blocks.push({ content: lines.slice(blockStart, i + 1).join('\n'), startLine: blockStart + 1, endLine: i + 1 });
        inBlock = false;
        blockStart = i + 1;
      }
    }
    if (blockStart < lines.length) {
      blocks.push({ content: lines.slice(blockStart).join('\n'), startLine: blockStart + 1, endLine: lines.length });
    }
    return blocks;
  }

  private isBlockStart(line: string): boolean {
    return /^\s*(?:export\s+)?(?:async\s+)?function\s|^\s*(?:export\s+)?class\s|^\s*(?:export\s+)?interface\s|^\s*(?:pub\s+)?fn\s|^\s*def\s|^\s*func\s/.test(line);
  }

  private assessQuality(content: string): number {
    let score = 0.5;
    if (content.length > 100) score += 0.1;
    if (content.length > 1000) score += 0.1;
    if (content.includes('function') || content.includes('class')) score += 0.1;
    if (content.includes('test') || content.includes('spec')) score += 0.1;
    if (content.includes('import') || content.includes('export')) score += 0.1;
    return Math.min(1, score);
  }
}
