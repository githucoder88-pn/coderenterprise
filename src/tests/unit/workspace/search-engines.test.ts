/**
 * Search Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordSearchEngine } from '../../../workspace/search/keyword-search.js';
import { RegexSearchEngine } from '../../../workspace/search/regex-search.js';
import { AstSearchEngine } from '../../../workspace/search/ast-search.js';
import { SemanticSearchEngine } from '../../../workspace/search/semantic-search.js';
import { HybridSearchEngine } from '../../../workspace/search/hybrid-search.js';
import type { SearchQuery } from '../../../workspace/types.js';

const sampleCode = `export function calculateTotal(items: CartItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

export class CartManager {
  private items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.items.push(item);
  }

  removeItem(id: string): void {
    this.items = this.items.filter(i => i.id !== id);
  }

  getTotal(): number {
    return calculateTotal(this.items);
  }
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
`;

function makeQuery(query: string, engine: SearchQuery['engine'] = 'keyword'): SearchQuery {
  return { query, engine, workspaceId: 'test-ws', maxResults: 50, offset: 0, caseSensitive: false, wholeWord: false, includeTests: true };
}

describe('KeywordSearchEngine', () => {
  let engine: KeywordSearchEngine;

  beforeEach(() => {
    engine = new KeywordSearchEngine();
    engine.indexFile('file-1', 'src/cart.ts', sampleCode);
  });

  it('should find keyword matches', () => {
    const result = engine.search(makeQuery('calculateTotal'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]!.filePath).toBe('src/cart.ts');
    expect(result.engine).toBe('keyword');
  });

  it('should find class names', () => {
    const result = engine.search(makeQuery('CartManager'));
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should return empty for no match', () => {
    const result = engine.search(makeQuery('nonexistentfunction'));
    expect(result.results.length).toBe(0);
  });

  it('should track stats', () => {
    const stats = engine.getStats();
    expect(stats.totalFiles).toBe(1);
    expect(stats.totalTerms).toBeGreaterThan(0);
  });

  it('should remove files', () => {
    engine.removeFile('file-1');
    const stats = engine.getStats();
    expect(stats.totalFiles).toBe(0);
  });
});

describe('RegexSearchEngine', () => {
  let engine: RegexSearchEngine;

  beforeEach(() => {
    engine = new RegexSearchEngine();
    engine.indexFile('file-1', 'src/cart.ts', sampleCode);
  });

  it('should find regex matches', () => {
    const result = engine.search(makeQuery('(?:function|class)\\s+\\w+', 'regex'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.engine).toBe('regex');
  });

  it('should handle capture groups', () => {
    const result = engine.search(makeQuery('price.*number', 'regex'));
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should handle invalid regex gracefully', () => {
    const result = engine.search(makeQuery('[invalid', 'regex'));
    expect(result.results.length).toBe(0);
  });

  it('should support case insensitive search', () => {
    const result = engine.search(makeQuery('CARTMANAGER', 'regex'));
    expect(result.results.length).toBeGreaterThan(0);
  });
});

describe('AstSearchEngine', () => {
  let engine: AstSearchEngine;

  beforeEach(() => {
    engine = new AstSearchEngine();
    engine.indexFile('file-1', 'src/cart.ts', sampleCode, 'typescript');
  });

  it('should find function symbols', () => {
    const result = engine.search(makeQuery('calculateTotal', 'ast'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]!.symbol).toBeDefined();
    expect(result.results[0]!.symbol!.kind).toBe('function');
  });

  it('should find class symbols', () => {
    const result = engine.search(makeQuery('CartManager', 'ast'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]!.symbol!.kind).toBe('class');
  });

  it('should find interface symbols', () => {
    const result = engine.search(makeQuery('CartItem', 'ast'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r) => r.symbol!.kind === 'interface')).toBe(true);
  });

  it('should find by kind', () => {
    const fns = engine.findByKind('function');
    expect(fns.length).toBeGreaterThan(0);
    expect(fns.every((r) => r.symbol!.kind === 'function')).toBe(true);
  });

  it('should find references', () => {
    const refs = engine.findReferences('calculateTotal');
    expect(refs.length).toBeGreaterThan(0);
  });

  it('should track stats', () => {
    const stats = engine.getStats();
    expect(stats.totalFiles).toBe(1);
    expect(stats.totalSymbols).toBeGreaterThan(0);
    expect(stats.byKind['function']).toBeGreaterThan(0);
  });
});

describe('SemanticSearchEngine', () => {
  let engine: SemanticSearchEngine;

  beforeEach(() => {
    engine = new SemanticSearchEngine();
    // Index with mock embeddings
    engine.indexEmbeddings('file-1', 'src/cart.ts', [
      { content: 'calculate total for shopping cart', embedding: [0.1, 0.2, 0.3, 0.4], lineStart: 1, lineEnd: 7 },
      { content: 'cart manager class with add remove', embedding: [0.2, 0.3, 0.4, 0.5], lineStart: 9, lineEnd: 25 },
    ]);
  });

  it('should find semantically similar content', () => {
    const results = engine.search([0.15, 0.25, 0.35, 0.45]);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.similarity).toBeGreaterThan(0.9);
  });

  it('should rank by similarity', () => {
    const results = engine.search([0.2, 0.3, 0.4, 0.5]);
    expect(results.length).toBeGreaterThan(0);
    // Exact match should be highest
    expect(results[0]!.similarity).toBeCloseTo(1.0, 5);
  });

  it('should respect threshold', () => {
    const results = engine.search([0.9, 0.8, 0.7, 0.6], { threshold: 0.99 });
    expect(results.length).toBe(0);
  });

  it('should find similar files', () => {
    engine.indexEmbeddings('file-2', 'src/checkout.ts', [
      { content: 'checkout and payment processing', embedding: [0.15, 0.25, 0.35, 0.45], lineStart: 1, lineEnd: 10 },
    ]);
    const similar = engine.findSimilar('file-1');
    expect(similar.length).toBeGreaterThan(0);
  });

  it('should compute cosine similarity correctly', () => {
    expect(engine.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    expect(engine.cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
    expect(engine.cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0);
  });
});

describe('HybridSearchEngine', () => {
  let engine: HybridSearchEngine;

  beforeEach(() => {
    engine = new HybridSearchEngine();
    engine.indexFile('file-1', 'src/cart.ts', sampleCode, 'typescript');
  });

  it('should fuse results from multiple engines', () => {
    const result = engine.search(makeQuery('calculateTotal', 'hybrid'));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.engine).toBe('hybrid');
    expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should deduplicate results', () => {
    const result = engine.search(makeQuery('CartManager', 'hybrid'));
    const uniqueKeys = new Set(result.results.map((r) => `${r.fileId}:${r.line}`));
    expect(uniqueKeys.size).toBe(result.results.length);
  });

  it('should track stats across engines', () => {
    const keywordStats = engine.keywordEngine.getStats();
    const astStats = engine.astEngine.getStats();
    expect(keywordStats.totalFiles).toBe(1);
    expect(astStats.totalFiles).toBe(1);
  });
});
