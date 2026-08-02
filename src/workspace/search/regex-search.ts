/**
 * Regex Search Engine
 *
 * Regular expression search with capture groups, context lines, and performance limits.
 */

import type { SearchQuery, SearchResponse, SearchResult } from '../types.js';

interface IndexedFile {
  readonly fileId: string;
  readonly path: string;
  readonly lines: readonly string[];
}

export class RegexSearchEngine {
  private readonly files = new Map<string, IndexedFile>();

  indexFile(fileId: string, path: string, content: string): void {
    this.files.set(fileId, { fileId, path, lines: content.split('\n') });
  }

  removeFile(fileId: string): void {
    this.files.delete(fileId);
  }

  search(query: SearchQuery): SearchResponse {
    const start = performance.now();
    const maxResults = query.maxResults ?? 50;
    const results: SearchResult[] = [];

    let regex: RegExp;
    try {
      const flags = query.caseSensitive ? 'gm' : 'gim';
      regex = new RegExp(query.query, flags);
    } catch {
      return { results: [], totalMatches: 0, searchTimeMs: performance.now() - start, engine: 'regex', query: query.query };
    }

    let timeout = false;
    const deadline = performance.now() + 5000; // 5s timeout

    for (const [, file] of this.files) {
      if (timeout) break;

      for (let lineNum = 0; lineNum < file.lines.length; lineNum++) {
        if (performance.now() > deadline) { timeout = true; break; }

        const line = file.lines[lineNum] ?? '';
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          results.push({
            fileId: file.fileId, filePath: file.path,
            line: lineNum + 1, column: match.index + 1,
            match: match[0],
            context: {
              before: file.lines.slice(Math.max(0, lineNum - 2), lineNum),
              after: file.lines.slice(lineNum + 1, lineNum + 3),
            },
            score: 1.0,
            engine: 'regex',
          });

          if (results.length >= maxResults) break;
          if (match[0].length === 0) regex.lastIndex++;
        }
        if (results.length >= maxResults) break;
      }
    }

    return {
      results: results.sort((a, b) => a.line - b.line),
      totalMatches: results.length,
      searchTimeMs: performance.now() - start,
      engine: 'regex',
      query: query.query,
    };
  }
}
