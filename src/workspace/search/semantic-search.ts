/**
 * Semantic Search Engine
 *
 * Vector-based semantic search using cosine similarity over file embeddings.
 */

import type { SearchQuery, SearchResult, SearchResponse, FileEmbedding, EmbeddingSearchResult } from '../types.js';

interface IndexedChunk {
  readonly fileId: string;
  readonly path: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly embedding: readonly number[];
  readonly lineStart: number;
  readonly lineEnd: number;
}

export class SemanticSearchEngine {
  private readonly chunks: IndexedChunk[] = [];
  private readonly fileChunks = new Map<string, IndexedChunk[]>();

  /**
   * Index file embeddings.
   */
  indexEmbeddings(fileId: string, path: string, embeddings: readonly {
    readonly content: string;
    readonly embedding: readonly number[];
    readonly lineStart: number;
    readonly lineEnd: number;
  }[]): void {
    const chunks: IndexedChunk[] = embeddings.map((e, i) => ({
      fileId, path, chunkIndex: i, content: e.content,
      embedding: e.embedding, lineStart: e.lineStart, lineEnd: e.lineEnd,
    }));

    this.fileChunks.set(fileId, chunks);
    this.chunks.push(...chunks);
  }

  /**
   * Remove file from index.
   */
  removeFile(fileId: string): void {
    this.fileChunks.delete(fileId);
    const idx = this.chunks.findIndex((c) => c.fileId === fileId);
    if (idx >= 0) this.chunks.splice(idx, this.chunks.length - idx + 1,
      ...this.chunks.filter((c) => c.fileId !== fileId));
  }

  /**
   * Search using a query embedding.
   */
  search(queryEmbedding: readonly number[], options: { maxResults?: number; threshold?: number; workspaceId?: string } = {}): EmbeddingSearchResult[] {
    const maxResults = options.maxResults ?? 20;
    const threshold = options.threshold ?? 0.3;

    const scored: EmbeddingSearchResult[] = [];

    for (const chunk of this.chunks) {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity >= threshold) {
        scored.push({
          fileId: chunk.fileId, filePath: chunk.path,
          chunkContent: chunk.content, similarity,
          lineStart: chunk.lineStart, lineEnd: chunk.lineEnd,
        });
      }
    }

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Find similar files.
   */
  findSimilar(fileId: string, maxResults = 10): EmbeddingSearchResult[] {
    const fileEmbeddings = this.fileChunks.get(fileId);
    if (!fileEmbeddings?.length) return [];

    // Average embedding of the source file
    const avgEmbedding = this.averageEmbeddings(fileEmbeddings.map((c) => c.embedding));

    // Find similar, excluding source file
    return this.search(avgEmbedding, { maxResults: maxResults + 1 })
      .filter((r) => r.fileId !== fileId)
      .slice(0, maxResults);
  }

  getStats(): { totalChunks: number; totalFiles: number; dimensions: number } {
    return {
      totalChunks: this.chunks.length,
      totalFiles: this.fileChunks.size,
      dimensions: this.chunks[0]?.embedding.length ?? 0,
    };
  }

  /**
   * Cosine similarity between two vectors.
   */
  cosineSimilarity(a: readonly number[], b: readonly number[]): number {
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

  private averageEmbeddings(embeddings: readonly (readonly number[])[]): number[] {
    const dim = embeddings[0]?.length ?? 0;
    const avg = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) avg[i] += emb[i] ?? 0;
    }
    for (let i = 0; i < dim; i++) avg[i] /= embeddings.length;
    return avg;
  }
}
