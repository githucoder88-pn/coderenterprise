/**
 * Workspace Indexer
 *
 * Recursive and incremental file indexing with language detection and AST parsing.
 */

import type { SupportedLanguage, IndexEntry, IndexStats, WorkspaceFile } from '../types.js';
import { LANGUAGE_EXTENSIONS } from '../types.js';
import type { FileService } from '../files/file-service.js';
import type { AstParser } from '../editors/ast-parser.js';
import type { HybridSearchEngine } from '../search/hybrid-search.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IIndexer {
  indexWorkspace(workspaceId: string): Promise<IndexStats>;
  indexFile(workspaceId: string, path: string): Promise<IndexEntry | null>;
  indexIncremental(workspaceId: string, changedFiles: readonly string[]): Promise<readonly IndexEntry>>;
  removeFile(fileId: string): void;
  getStats(workspaceId: string): IndexStats;
  getEntry(fileId: string): IndexEntry | null;
  getEntryByPath(path: string): IndexEntry | null;
  rebuild(workspaceId: string): Promise<IndexStats>;
}

export class WorkspaceIndexer implements IIndexer {
  private readonly entries = new Map<string, IndexEntry>();
  private readonly pathIndex = new Map<string, string>(); // path -> fileId
  private lastFullIndex: Date | null = null;

  constructor(
    private readonly fileService: FileService,
    private readonly parser: AstParser,
    private readonly searchEngine: HybridSearchEngine,
    private readonly logger: ILogger,
  ) {}

  async indexWorkspace(workspaceId: string): Promise<IndexStats> {
    this.logger.info({ workspaceId }, 'Starting full workspace index');
    const start = performance.now();

    const filesResult = await this.fileService.listDirectory(workspaceId, '/', true);
    if (!filesResult.success) {
      return this.getStats(workspaceId);
    }

    const files = filesResult.data.filter((f) => !f.isDirectory);
    let indexed = 0;

    for (const file of files) {
      try {
        await this.indexOneFile(workspaceId, file);
        indexed++;
      } catch (error) {
        this.logger.warn({ path: file.path, error }, 'Failed to index file');
      }
    }

    this.lastFullIndex = new Date();
    const elapsed = performance.now() - start;
    this.logger.info({ workspaceId, indexed, total: files.length, elapsedMs: elapsed.toFixed(0) }, 'Index complete');

    return this.getStats(workspaceId);
  }

  async indexFile(workspaceId: string, path: string): Promise<IndexEntry | null> {
    const existing = this.pathIndex.get(path);
    if (existing) this.removeFile(existing);

    const readResult = await this.fileService.readFile(workspaceId, path);
    if (!readResult.success) return null;

    const content = readResult.data.content;
    const ext = this.getExtension(path);
    const language = LANGUAGE_EXTENSIONS[ext] ?? null;

    return this.createEntry(workspaceId, path, content, language);
  }

  async indexIncremental(workspaceId: string, changedFiles: readonly string[]): Promise<readonly IndexEntry> {
    const entries: IndexEntry[] = [];
    for (const path of changedFiles) {
      const entry = await this.indexFile(workspaceId, path);
      if (entry) entries.push(entry);
    }
    return entries;
  }

  removeFile(fileIdOrPath: string): void {
    const entry = this.entries.get(fileIdOrPath);
    if (entry) {
      this.searchEngine.removeFile(entry.fileId);
      this.pathIndex.delete(entry.path);
      this.entries.delete(entry.fileId);
    } else {
      // Try as path
      const fileId = this.pathIndex.get(fileIdOrPath);
      if (fileId) this.removeFile(fileId);
    }
  }

  getStats(workspaceId: string): IndexStats {
    const byLanguage: Record<string, { files: number; symbols: number; lines: number }> = {};
    let totalSymbols = 0, totalLines = 0;

    for (const entry of this.entries.values()) {
      const lang = entry.language ?? 'unknown';
      if (!byLanguage[lang]) byLanguage[lang] = { files: 0, symbols: 0, lines: 0 };
      byLanguage[lang].files++;
      byLanguage[lang].symbols += entry.symbols.length;
      byLanguage[lang].lines += entry.lineCount;
      totalSymbols += entry.symbols.length;
      totalLines += entry.lineCount;
    }

    return {
      totalFiles: this.entries.size, totalSymbols, totalLines, byLanguage,
      lastFullIndex: this.lastFullIndex, indexSizeBytes: this.estimateSize(),
    };
  }

  getEntry(fileId: string): IndexEntry | null {
    return this.entries.get(fileId) ?? null;
  }

  getEntryByPath(path: string): IndexEntry | null {
    const fileId = this.pathIndex.get(path);
    return fileId ? this.entries.get(fileId) ?? null : null;
  }

  async rebuild(workspaceId: string): Promise<IndexStats> {
    this.entries.clear();
    this.pathIndex.clear();
    return this.indexWorkspace(workspaceId);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async indexOneFile(workspaceId: string, file: WorkspaceFile): Promise<void> {
    const readResult = await this.fileService.readFile(workspaceId, file.path);
    if (!readResult.success) return;
    this.createEntry(workspaceId, file.path, readResult.data.content, file.language);
  }

  private createEntry(workspaceId: string, path: string, content: string, language: SupportedLanguage | null): IndexEntry {
    const fileId = crypto.randomUUID();
    const lines = content.split('\n');

    let symbols: IndexEntry['symbols'] = [];
    if (language) {
      const result = this.parser.parse(content, language, path);
      symbols = result.symbols;
    }

    const entry: IndexEntry = {
      fileId, path, hash: this.hashContent(content), language, symbols,
      lineCount: lines.length, size: content.length,
      lastIndexed: new Date(),
    };

    this.entries.set(fileId, entry);
    this.pathIndex.set(path, fileId);

    // Index in search engine
    this.searchEngine.indexFile(fileId, path, content, language ?? undefined);

    return entry;
  }

  private getExtension(path: string): string {
    const dot = path.lastIndexOf('.');
    return dot >= 0 ? path.slice(dot) : '';
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private estimateSize(): number {
    let size = 0;
    for (const entry of this.entries.values()) {
      size += entry.path.length + entry.hash.length + entry.symbols.length * 200;
    }
    return size;
  }
}
