/**
 * AST Search Engine
 *
 * Search code by AST symbol properties: name, kind, parameters, return types.
 */

import type { SearchQuery, SearchResponse, SearchResult, AstSymbol, SupportedLanguage, IndexEntry } from '../types.js';
import { AstParser } from '../editors/ast-parser.js';

interface SymbolIndex {
  readonly fileId: string;
  readonly path: string;
  readonly language: SupportedLanguage;
  readonly symbols: readonly AstSymbol[];
}

export class AstSearchEngine {
  private readonly files = new Map<string, SymbolIndex>();
  private readonly parser = new AstParser();

  /**
   * Index a file's AST symbols.
   */
  indexFile(fileId: string, path: string, content: string, language: SupportedLanguage): void {
    const result = this.parser.parse(content, language, path);
    this.files.set(fileId, { fileId, path, language, symbols: result.symbols });
  }

  removeFile(fileId: string): void {
    this.files.delete(fileId);
  }

  /**
   * Search symbols by name pattern.
   */
  search(query: SearchQuery): SearchResponse {
    const start = performance.now();
    const maxResults = query.maxResults ?? 50;
    const results: SearchResult[] = [];
    const pattern = query.caseSensitive ? query.query : query.query.toLowerCase();

    for (const [, file] of this.files) {
      this.searchSymbols(file.symbols, pattern, file, query, results, maxResults);
      if (results.length >= maxResults) break;
    }

    return {
      results, totalMatches: results.length,
      searchTimeMs: performance.now() - start,
      engine: 'ast', query: query.query,
    };
  }

  /**
   * Find all symbols of a specific kind.
   */
  findByKind(kind: AstSymbol['kind'], workspaceId?: string): SearchResult[] {
    const results: SearchResult[] = [];
    for (const [, file] of this.files) {
      this.walkSymbols(file.symbols, (symbol) => {
        if (symbol.kind === kind) {
          results.push({
            fileId: file.fileId, filePath: file.path,
            line: symbol.startLine, column: 0,
            match: `${symbol.kind} ${symbol.name}`,
            context: { before: [], after: [] }, score: 1.0,
            engine: 'ast', symbol,
          });
        }
      });
    }
    return results;
  }

  /**
   * Find symbol references (where a symbol is used).
   */
  findReferences(symbolName: string): SearchResult[] {
    const results: SearchResult[] = [];
    for (const [, file] of this.files) {
      this.walkSymbols(file.symbols, (symbol) => {
        if (symbol.name === symbolName) {
          results.push({
            fileId: file.fileId, filePath: file.path,
            line: symbol.startLine, column: 0,
            match: `${symbol.kind} ${symbol.name}`,
            context: { before: [], after: [] }, score: 1.0,
            engine: 'ast', symbol,
          });
        }
      });
    }
    return results;
  }

  getStats(): { totalFiles: number; totalSymbols: number; byKind: Record<string, number> } {
    const byKind: Record<string, number> = {};
    let totalSymbols = 0;

    for (const [, file] of this.files) {
      this.walkSymbols(file.symbols, (s) => {
        totalSymbols++;
        byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
      });
    }

    return { totalFiles: this.files.size, totalSymbols, byKind };
  }

  private searchSymbols(
    symbols: readonly AstSymbol[], pattern: string,
    file: SymbolIndex, query: SearchQuery,
    results: SearchResult[], maxResults: number,
  ): void {
    for (const symbol of symbols) {
      if (results.length >= maxResults) return;

      const name = query.caseSensitive ? symbol.name : symbol.name.toLowerCase();
      const matchesKind = !query.symbolKind || symbol.kind === query.symbolKind;
      const matchesPattern = name.includes(pattern) || pattern === '*';

      if (matchesKind && matchesPattern) {
        results.push({
          fileId: file.fileId, filePath: file.path,
          line: symbol.startLine, column: 0,
          match: `${symbol.kind} ${symbol.name}${symbol.returnType ? `: ${symbol.returnType}` : ''}`,
          context: {
            before: symbol.docstring ? [symbol.docstring] : [],
            after: symbol.parameters.length > 0
              ? [`params: ${symbol.parameters.map((p) => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ')}`]
              : [],
          },
          score: name === pattern ? 1.0 : name.startsWith(pattern) ? 0.8 : 0.5,
          engine: 'ast', symbol,
        });
      }

      // Search children
      if (symbol.children.length > 0) {
        this.searchSymbols(symbol.children, pattern, file, query, results, maxResults);
      }
    }
  }

  private walkSymbols(symbols: readonly AstSymbol[], callback: (s: AstSymbol) => void): void {
    for (const s of symbols) {
      callback(s);
      if (s.children.length > 0) this.walkSymbols(s.children, callback);
    }
  }
}
