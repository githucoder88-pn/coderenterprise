/**
 * Keyword Search Engine
 *
 * Fast substring/keyword matching across indexed files.
 * Uses an inverted index for O(1) lookups.
 */

import type { SearchQuery, SearchResult, SearchResponse, IndexEntry } from '../types.js';

interface InvertedIndex {
  readonly term: string;
  readonly entries: readonly { fileId: string; path: string; line: number; column: number }[];
}

export class KeywordSearchEngine {
  private readonly index = new Map<string, InvertedIndex['entries']>();
  private readonly fileContents = new Map<string, { lines: readonly string[]; path: string }>();

  /**
   * Index a file's content for keyword search.
   */
  indexFile(fileId: string, path: string, content: string): void {
    const lines = content.split('\n');
    this.fileContents.set(fileId, { lines, path });

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum] ?? '';
      const tokens = this.tokenize(line);
      for (const token of tokens) {
        const key = token.toLowerCase();
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key)!.push({ fileId, path, line: lineNum + 1, column: 0 });
      }
    }
  }

  /**
   * Remove a file from the index.
   */
  removeFile(fileId: string): void {
    this.fileContents.delete(fileId);
    for (const [term, entries] of this.index) {
      const filtered = entries.filter((e) => e.fileId !== fileId);
      if (filtered.length === 0) this.index.delete(term);
      else this.index.set(term, filtered);
    }
  }

  /**
   * Execute a keyword search.
   */
  search(query: SearchQuery): SearchResponse {
    const start = performance.now();
    const maxResults = query.maxResults ?? 50;
    const results: SearchResult[] = [];

    const terms = query.caseSensitive
      ? this.tokenize(query.query)
      : this.tokenize(query.query).map((t) => t.toLowerCase());

    // Find files matching ALL terms
    const fileMatches = new Map<string, Map<number, Set<string>>>();

    for (const term of terms) {
      const key = query.caseSensitive ? term : term.toLowerCase();
      const entries = this.index.get(key) ?? [];

      for (const entry of entries) {
        if (!fileMatches.has(entry.fileId)) fileMatches.set(entry.fileId, new Map());
        const lineMap = fileMatches.get(entry.fileId)!;
        if (!lineMap.has(entry.line)) lineMap.set(entry.line, new Set());
        lineMap.get(entry.line)!.add(term);
      }
    }

    // Filter: require all terms to match
    for (const [fileId, lineMap] of fileMatches) {
      const fileData = this.fileContents.get(fileId);
      if (!fileData) continue;

      for (const [lineNum, matchedTerms] of lineMap) {
        if (matchedTerms.size < terms.length) continue;

        const line = fileData.lines[lineNum - 1] ?? '';
        const matchIdx = query.caseSensitive
          ? line.indexOf(query.query)
          : line.toLowerCase().indexOf(query.query.toLowerCase());

        if (matchIdx === -1 && terms.length > 1) continue;

        results.push({
          fileId, filePath: fileData.path,
          line: lineNum, column: matchIdx >= 0 ? matchIdx + 1 : 0,
          match: line.trim(),
          context: {
            before: fileData.lines.slice(Math.max(0, lineNum - 3), lineNum - 1),
            after: fileData.lines.slice(lineNum, lineNum + 2),
          },
          score: this.calculateScore(query.query, line, query),
          engine: 'keyword',
        });

        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    return {
      results: results.sort((a, b) => b.score - a.score),
      totalMatches: results.length,
      searchTimeMs: performance.now() - start,
      engine: 'keyword',
      query: query.query,
    };
  }

  getStats(): { totalTerms: number; totalEntries: number; totalFiles: number } {
    let totalEntries = 0;
    for (const entries of this.index.values()) totalEntries += entries.length;
    return { totalTerms: this.index.size, totalEntries, totalFiles: this.fileContents.size };
  }

  private tokenize(text: string): string[] {
    return text.split(/[\s\-_.,;:!?(){}\[\]<>"'`~@#$%^&*+=|\\/]+/).filter((t) => t.length > 1);
  }

  private calculateScore(query: string, match: string, options: SearchQuery): number {
    const lower = options.caseSensitive ? match : match.toLowerCase();
    const q = options.caseSensitive ? query : query.toLowerCase();
    if (lower === q) return 1.0;
    if (lower.includes(q)) return 0.8;
    return 0.5;
  }
}
