/**
 * Embedding Service
 *
 * Chunks files and generates vector embeddings for semantic search.
 * Integrates with the Provider Platform for embedding generation.
 */

import type { FileEmbedding, SupportedLanguage } from '../types.js';
import type { SemanticSearchEngine } from '../search/semantic-search.js';
import type { ILogger } from '../../telemetry/logger.js';

interface EmbeddingProvider {
  embed(text: string): Promise<readonly number[]>;
  dimensions: number;
}

export interface IEmbeddingService {
  indexFile(fileId: string, path: string, content: string, language?: SupportedLanguage): Promise<readonly FileEmbedding[]>;
  indexBatch(files: readonly { fileId: string; path: string; content: string; language?: SupportedLanguage }[]): Promise<number>;
  search(query: string, maxResults?: number): Promise<readonly { fileId: string; path: string; similarity: number; content: string }[]>;
  removeFile(fileId: string): void;
  getStats(): { totalChunks: number; totalFiles: number; dimensions: number };
}

export class EmbeddingService implements IEmbeddingService {
  private readonly embeddings = new Map<string, FileEmbedding[]>();

  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly searchEngine: SemanticSearchEngine,
    private readonly logger: ILogger,
    private readonly chunkSize = 512,
    private readonly chunkOverlap = 64,
  ) {}

  async indexFile(fileId: string, path: string, content: string, language?: SupportedLanguage): Promise<readonly FileEmbedding[]> {
    const chunks = this.chunkContent(content, language);
    const embeddings: FileEmbedding[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      try {
        const vector = await this.provider.embed(chunk.content);
        const embedding: FileEmbedding = {
          fileId, path, chunkIndex: i, chunkContent: chunk.content,
          embedding: vector, model: 'default', createdAt: new Date(),
        };
        embeddings.push(embedding);
      } catch (error) {
        this.logger.warn({ fileId, path, chunk: i, error }, 'Failed to embed chunk');
      }
    }

    this.embeddings.set(fileId, embeddings);

    // Index in search engine
    this.searchEngine.indexEmbeddings(fileId, path, embeddings.map((e) => ({
      content: e.chunkContent, embedding: e.embedding,
      lineStart: chunks[e.chunkIndex]?.lineStart ?? 0, lineEnd: chunks[e.chunkIndex]?.lineEnd ?? 0,
    })));

    return embeddings;
  }

  async indexBatch(files: readonly { fileId: string; path: string; content: string; language?: SupportedLanguage }[]): Promise<number> {
    let indexed = 0;
    for (const file of files) {
      try {
        await this.indexFile(file.fileId, file.path, file.content, file.language);
        indexed++;
      } catch (error) {
        this.logger.warn({ path: file.path, error }, 'Failed to index file embeddings');
      }
    }
    return indexed;
  }

  async search(query: string, maxResults = 20): Promise<readonly { fileId: string; path: string; similarity: number; content: string }[]> {
    const queryEmbedding = await this.provider.embed(query);
    return this.searchEngine.search(queryEmbedding, { maxResults }).map((r) => ({
      fileId: r.fileId, path: r.filePath, similarity: r.similarity, content: r.chunkContent,
    }));
  }

  removeFile(fileId: string): void {
    this.embeddings.delete(fileId);
    this.searchEngine.removeFile(fileId);
  }

  getStats(): { totalChunks: number; totalFiles: number; dimensions: number } {
    return {
      totalChunks: [...this.embeddings.values()].reduce((sum, e) => sum + e.length, 0),
      totalFiles: this.embeddings.size,
      dimensions: this.provider.dimensions,
    };
  }

  /**
   * Split content into overlapping chunks for embedding.
   */
  chunkContent(content: string, language?: SupportedLanguage): readonly { content: string; lineStart: number; lineEnd: number }[] {
    const lines = content.split('\n');
    const chunks: { content: string; lineStart: number; lineEnd: number }[] = [];

    // Smart chunking: split by code blocks (functions, classes)
    if (language) {
      const blocks = this.splitByCodeBlocks(lines, language);
      for (const block of blocks) {
        if (block.content.length > 0) {
          chunks.push(block);
        }
      }
    }

    // Fallback: fixed-size chunking with overlap
    if (chunks.length === 0) {
      const words = content.split(/\s+/);
      for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
        const chunkWords = words.slice(i, i + this.chunkSize);
        const chunkContent = chunkWords.join(' ');
        const beforeContent = words.slice(0, i).join(' ');
        const lineStart = beforeContent.split('\n').length;
        const lineEnd = lineStart + chunkContent.split('\n').length - 1;
        chunks.push({ content: chunkContent, lineStart, lineEnd });
      }
    }

    return chunks;
  }

  private splitByCodeBlocks(lines: readonly string[], language: SupportedLanguage): { content: string; lineStart: number; lineEnd: number }[] {
    const blocks: { content: string; lineStart: number; lineEnd: number }[] = [];
    let blockStart = 0;
    let depth = 0;
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Detect function/class/class-like definitions
      if (this.isBlockStart(line, language) && depth === 0) {
        if (inBlock && i > blockStart) {
          blocks.push({ content: lines.slice(blockStart, i).join('\n'), lineStart: blockStart + 1, lineEnd: i });
        }
        blockStart = i;
        inBlock = true;
      }

      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }

      // End of block
      if (inBlock && depth <= 0 && i > blockStart) {
        depth = 0;
        blocks.push({ content: lines.slice(blockStart, i + 1).join('\n'), lineStart: blockStart + 1, lineEnd: i + 1 });
        inBlock = false;
        blockStart = i + 1;
      }
    }

    // Remaining content
    if (blockStart < lines.length) {
      blocks.push({ content: lines.slice(blockStart).join('\n'), lineStart: blockStart + 1, lineEnd: lines.length });
    }

    return blocks;
  }

  private isBlockStart(line: string, language: SupportedLanguage): boolean {
    const trimmed = line.trim();
    const patterns: RegExp[] = [
      /(?:export\s+)?(?:async\s+)?function\s+\w/,
      /(?:export\s+)?(?:abstract\s+)?class\s+\w/,
      /(?:export\s+)?interface\s+\w/,
      /(?:pub\s+)?(?:async\s+)?fn\s+\w/,
      /func\s+/,
      /def\s+\w/,
      /(?:public|private|protected)\s+/,
    ];
    return patterns.some((p) => p.test(trimmed));
  }
}
