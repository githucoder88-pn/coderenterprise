/**
 * Knowledge Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Memory Layers ───────────────────────────────────────────────────────────

export type MemoryLayer =
  | 'working' | 'session' | 'conversation' | 'semantic'
  | 'workspace' | 'organizational' | 'global';

export interface MemoryEntry extends Timestamps {
  readonly id: string;
  readonly layer: MemoryLayer;
  readonly userId: string;
  readonly organizationId: string;
  readonly key: string;
  readonly value: string;
  readonly summary: string | null;
  readonly embedding: readonly number[] | null;
  readonly importance: number;
  readonly accessCount: number;
  readonly lastAccessedAt: Date | null;
  readonly tags: readonly string[];
  readonly source: string;
  readonly expiresAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Knowledge Entity ────────────────────────────────────────────────────────

export type KnowledgeSource =
  | 'repository' | 'document' | 'image' | 'conversation'
  | 'website' | 'knowledge_base' | 'workspace' | 'extension';

export interface KnowledgeEntity extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly source: KnowledgeSource;
  readonly sourceId: string;
  readonly title: string;
  readonly content: string;
  readonly summary: string | null;
  readonly embedding: readonly number[] | null;
  readonly chunks: readonly KnowledgeChunk[];
  readonly tags: readonly string[];
  readonly language: string | null;
  readonly quality: number;
  readonly accessCount: number;
  readonly metadata: Record<string, unknown>;
}

export interface KnowledgeChunk {
  readonly id: string;
  readonly entityId: string;
  readonly index: number;
  readonly content: string;
  readonly embedding: readonly number[] | null;
  readonly startLine: number | null;
  readonly endLine: number | null;
  readonly tokenCount: number;
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

export type SearchMode = 'keyword' | 'semantic' | 'hybrid' | 'vector' | 'graph';

export interface RetrievalQuery {
  readonly query: string;
  readonly mode: SearchMode;
  readonly organizationId: string;
  readonly userId: string;
  readonly filters?: {
    readonly sources?: readonly KnowledgeSource[];
    readonly tags?: readonly string[];
    readonly languages?: readonly string[];
    readonly dateRange?: { from: Date; to: Date };
    readonly minQuality?: number;
  };
  readonly maxResults?: number;
  readonly minScore?: number;
  readonly includeSummary?: boolean;
}

export interface RetrievalResult {
  readonly id: string;
  readonly entityId: string;
  readonly chunkId: string | null;
  readonly title: string;
  readonly content: string;
  readonly summary: string | null;
  readonly score: number;
  readonly source: KnowledgeSource;
  readonly highlights: readonly string[];
  readonly metadata: Record<string, unknown>;
}

export interface RetrievalResponse {
  readonly results: readonly RetrievalResult[];
  readonly totalMatches: number;
  readonly searchTimeMs: number;
  readonly mode: SearchMode;
  readonly query: string;
  readonly context: string;
}

// ─── Index ───────────────────────────────────────────────────────────────────

export interface IndexEntry extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly entityId: string;
  readonly chunkId: string;
  readonly content: string;
  readonly embedding: readonly number[];
  readonly tokens: readonly string[];
  readonly source: KnowledgeSource;
  readonly quality: number;
  readonly metadata: Record<string, unknown>;
}

export interface IndexStats {
  readonly totalEntries: number;
  readonly totalEntities: number;
  readonly totalChunks: number;
  readonly bySource: Record<string, number>;
  readonly averageQuality: number;
  readonly lastIndexedAt: Date | null;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

export interface RankingSignal {
  readonly name: string;
  readonly weight: number;
  readonly value: number;
}

export interface RankedResult {
  readonly result: RetrievalResult;
  readonly signals: readonly RankingSignal[];
  readonly finalScore: number;
}

// ─── Summarization ───────────────────────────────────────────────────────────

export interface SummaryRequest {
  readonly content: string;
  readonly maxLength?: number;
  readonly style?: 'brief' | 'detailed' | 'bullet_points';
  readonly language?: string;
}

export interface SummaryResult {
  readonly summary: string;
  readonly keyPoints: readonly string[];
  readonly tokenCount: number;
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

export interface IngestionRequest {
  readonly source: KnowledgeSource;
  readonly sourceId: string;
  readonly organizationId: string;
  readonly content: string;
  readonly title: string;
  readonly language?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface IngestionResult {
  readonly entityId: string;
  readonly chunksCreated: number;
  readonly embeddingsGenerated: number;
  readonly totalTimeMs: number;
}

// ─── Optimization ────────────────────────────────────────────────────────────

export interface OptimizationResult {
  readonly entriesRemoved: number;
  readonly duplicatesFound: number;
  readonly cacheHits: number;
  readonly compressionRatio: number;
  readonly totalTimeMs: number;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const StoreMemorySchema = z.object({
  layer: z.enum(['working', 'session', 'conversation', 'semantic', 'workspace', 'organizational', 'global']),
  key: z.string().min(1).max(500),
  value: z.string().min(1).max(100_000),
  summary: z.string().max(2000).optional(),
  importance: z.number().int().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
  source: z.string().default('user'),
  expiresInMs: z.number().int().positive().optional(),
});

export const IngestSchema = z.object({
  source: z.enum(['repository', 'document', 'image', 'conversation', 'website', 'knowledge_base', 'workspace', 'extension']),
  sourceId: z.string().min(1),
  organizationId: z.string().min(1),
  content: z.string().min(1),
  title: z.string().min(1).max(500),
  language: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const SearchSchema = z.object({
  query: z.string().min(1),
  mode: z.enum(['keyword', 'semantic', 'hybrid', 'vector', 'graph']).default('hybrid'),
  organizationId: z.string().min(1),
  maxResults: z.number().int().min(1).max(100).default(20),
  minScore: z.number().min(0).max(1).default(0.3),
});
