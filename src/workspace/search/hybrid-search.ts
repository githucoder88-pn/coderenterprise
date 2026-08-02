/**
 * Hybrid Search Engine
 *
 * Combines keyword, semantic, and AST search with score fusion.
 * Uses Reciprocal Rank Fusion (RRF) for combining results.
 */

import type { SearchQuery, SearchResponse, SearchResult } from '../types.js';
import { KeywordSearchEngine } from './keyword-search.js';
import { SemanticSearchEngine } from './semantic-search.js';
import { AstSearchEngine } from './ast-search.js';

interface HybridConfig {
  readonly keywordWeight: number;
  readonly semanticWeight: number;
  readonly astWeight: number;
  readonly rrfK: number; // RRF constant (typically 60)
}

const DEFAULT_CONFIG: HybridConfig = {
  keywordWeight: 0.4,
  semanticWeight: 0.4,
  astWeight: 0.2,
  rrfK: 60,
};

export class HybridSearchEngine {
  private readonly keyword: KeywordSearchEngine;
  private readonly semantic: SemanticSearchEngine;
  private readonly ast: AstSearchEngine;
  private readonly config: HybridConfig;

  constructor(
    keyword?: KeywordSearchEngine,
    semantic?: SemanticSearchEngine,
    ast?: AstSearchEngine,
    config?: Partial<HybridConfig>,
  ) {
    this.keyword = keyword ?? new KeywordSearchEngine();
    this.semantic = semantic ?? new SemanticSearchEngine();
    this.ast = ast ?? new AstSearchEngine();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get keywordEngine(): KeywordSearchEngine { return this.keyword; }
  get semanticEngine(): SemanticSearchEngine { return this.semantic; }
  get astEngine(): AstSearchEngine { return this.ast; }

  /**
   * Index a file across all engines.
   */
  indexFile(fileId: string, path: string, content: string, language?: string): void {
    this.keyword.indexFile(fileId, path, content);
    if (language && this.isSupportedLanguage(language)) {
      this.ast.indexFile(fileId, path, content, language as any);
    }
  }

  removeFile(fileId: string): void {
    this.keyword.removeFile(fileId);
    this.semantic.removeFile(fileId);
    this.ast.removeFile(fileId);
  }

  /**
   * Execute hybrid search across all engines.
   */
  search(query: SearchQuery): SearchResponse {
    const start = performance.now();
    const maxResults = query.maxResults ?? 50;

    // Run all engines in parallel conceptually
    const keywordResults = this.keyword.search({ ...query, maxResults: maxResults * 2 });
    const astResults = this.ast.search({ ...query, maxResults: maxResults * 2 });

    // Fuse results using Reciprocal Rank Fusion
    const fused = this.fuseResults(
      [
        { results: keywordResults.results, weight: this.config.keywordWeight },
        { results: astResults.results, weight: this.config.astWeight },
      ],
      maxResults,
    );

    return {
      results: fused,
      totalMatches: fused.length,
      searchTimeMs: performance.now() - start,
      engine: 'hybrid',
      query: query.query,
    };
  }

  /**
   * Reciprocal Rank Fusion: combines ranked lists from multiple engines.
   *
   * RRF score = Σ (weight / (k + rank_i))
   */
  private fuseResults(
    engineResults: readonly { results: readonly SearchResult[]; weight: number }[],
    maxResults: number,
  ): SearchResult[] {
    const scoreMap = new Map<string, { result: SearchResult; score: number }>();

    for (const { results, weight } of engineResults) {
      for (let rank = 0; rank < results.length; rank++) {
        const result = results[rank]!;
        const key = `${result.fileId}:${result.line}`;
        const existing = scoreMap.get(key);
        const rrfScore = weight / (this.config.rrfK + rank + 1);

        if (existing) {
          existing.score += rrfScore;
        } else {
          scoreMap.set(key, { result: { ...result, engine: 'hybrid' }, score: rrfScore });
        }
      }
    }

    return [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((entry) => ({ ...entry.result, score: entry.score }));
  }

  private isSupportedLanguage(lang: string): boolean {
    return ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'csharp', 'kotlin'].includes(lang);
  }
}
