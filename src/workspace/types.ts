/**
 * Workspace Engine — Core Type Definitions
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Supported Languages ─────────────────────────────────────────────────────

export type SupportedLanguage =
  | 'typescript' | 'javascript' | 'python' | 'rust' | 'go'
  | 'java' | 'c' | 'cpp' | 'csharp' | 'kotlin';

export const LANGUAGE_EXTENSIONS: Record<string, SupportedLanguage> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyi': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.hh': 'cpp',
  '.cs': 'csharp',
  '.kt': 'kotlin', '.kts': 'kotlin',
};

export const LANGUAGE_COMMENT: Record<SupportedLanguage, { line: string; block?: { open: string; close: string } }> = {
  typescript: { line: '//', block: { open: '/*', close: '*/' } },
  javascript: { line: '//', block: { open: '/*', close: '*/' } },
  python: { line: '#', block: { open: '"""', close: '"""' } },
  rust: { line: '//', block: { open: '/*', close: '*/' } },
  go: { line: '//', block: { open: '/*', close: '*/' } },
  java: { line: '//', block: { open: '/*', close: '*/' } },
  c: { line: '//', block: { open: '/*', close: '*/' } },
  cpp: { line: '//', block: { open: '/*', close: '*/' } },
  csharp: { line: '//', block: { open: '/*', close: '*/' } },
  kotlin: { line: '//', block: { open: '/*', close: '*/' } },
};

// ─── File Types ──────────────────────────────────────────────────────────────

export interface WorkspaceFile extends Timestamps {
  readonly id: string;
  readonly workspaceId: string;
  readonly path: string;
  readonly name: string;
  readonly extension: string;
  readonly language: SupportedLanguage | null;
  readonly size: number;
  readonly hash: string;
  readonly encoding: 'utf8' | 'base64' | 'binary';
  readonly isDirectory: boolean;
  readonly parentId: string | null;
  readonly depth: number;
  readonly metadata: Record<string, unknown>;
}

export interface FileContent {
  readonly fileId: string;
  readonly path: string;
  readonly content: string;
  readonly hash: string;
  readonly size: number;
  readonly encoding: 'utf8' | 'base64';
  readonly compressed: boolean;
  readonly version: number;
}

export interface WriteOptions {
  readonly encoding?: 'utf8' | 'base64';
  readonly compress?: boolean;
  readonly atomic?: boolean;
  readonly createDirs?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface ReadOptions {
  readonly encoding?: 'utf8' | 'base64';
  readonly decompress?: boolean;
  readonly version?: number;
}

// ─── AST Types ───────────────────────────────────────────────────────────────

export interface AstNode {
  readonly type: string;
  readonly name: string | null;
  readonly startLine: number;
  readonly endLine: number;
  readonly startCol: number;
  readonly endCol: number;
  readonly children: readonly AstNode[];
  readonly metadata: Record<string, unknown>;
}

export interface AstSymbol {
  readonly name: string;
  readonly kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum' | 'module' | 'method' | 'property' | 'import' | 'export';
  readonly language: SupportedLanguage;
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly docstring: string | null;
  readonly returnType: string | null;
  readonly parameters: readonly { name: string; type: string | null; defaultValue: string | null }[];
  readonly modifiers: readonly string[];
  readonly children: readonly AstSymbol[];
}

export interface ParseResult {
  readonly symbols: readonly AstSymbol[];
  readonly imports: readonly { source: string; specifiers: readonly string[]; isDefault: boolean }[];
  readonly exports: readonly { name: string; kind: string }[];
  readonly errors: readonly { message: string; line: number; column: number }[];
  readonly lineCount: number;
}

// ─── Search Types ────────────────────────────────────────────────────────────

export type SearchEngine = 'keyword' | 'semantic' | 'hybrid' | 'regex' | 'ast';

export interface SearchQuery {
  readonly query: string;
  readonly engine: SearchEngine;
  readonly workspaceId: string;
  readonly paths?: readonly string[];
  readonly languages?: readonly SupportedLanguage[];
  readonly filePattern?: string;
  readonly maxResults?: number;
  readonly offset?: number;
  readonly caseSensitive?: boolean;
  readonly wholeWord?: boolean;
  readonly includeTests?: boolean;
  readonly symbolKind?: AstSymbol['kind'];
}

export interface SearchResult {
  readonly fileId: string;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly match: string;
  readonly context: { readonly before: readonly string[]; readonly after: readonly string[] };
  readonly score: number;
  readonly engine: SearchEngine;
  readonly symbol?: AstSymbol;
}

export interface SearchResponse {
  readonly results: readonly SearchResult[];
  readonly totalMatches: number;
  readonly searchTimeMs: number;
  readonly engine: SearchEngine;
  readonly query: string;
}

// ─── Index Types ─────────────────────────────────────────────────────────────

export interface IndexEntry {
  readonly fileId: string;
  readonly path: string;
  readonly hash: string;
  readonly language: SupportedLanguage | null;
  readonly symbols: readonly AstSymbol[];
  readonly lineCount: number;
  readonly size: number;
  readonly lastIndexed: Date;
}

export interface IndexStats {
  readonly totalFiles: number;
  readonly totalSymbols: number;
  readonly totalLines: number;
  readonly byLanguage: Record<string, { files: number; symbols: number; lines: number }>;
  readonly lastFullIndex: Date | null;
  readonly indexSizeBytes: number;
}

// ─── Embedding Types ─────────────────────────────────────────────────────────

export interface FileEmbedding {
  readonly fileId: string;
  readonly path: string;
  readonly chunkIndex: number;
  readonly chunkContent: string;
  readonly embedding: readonly number[];
  readonly model: string;
  readonly createdAt: Date;
}

export interface EmbeddingSearchResult {
  readonly fileId: string;
  readonly filePath: string;
  readonly chunkContent: string;
  readonly similarity: number;
  readonly lineStart: number;
  readonly lineEnd: number;
}

// ─── Snapshot Types ──────────────────────────────────────────────────────────

export interface Snapshot extends Timestamps {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description: string;
  readonly hash: string;
  readonly fileCount: number;
  readonly totalSize: number;
  readonly compressedSize: number;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
}

export interface SnapshotDiff {
  readonly snapshotIdA: string;
  readonly snapshotIdB: string;
  readonly added: readonly { path: string; size: number }[];
  readonly removed: readonly { path: string; size: number }[];
  readonly modified: readonly { path: string; oldSize: number; newSize: number }[];
  readonly unchanged: number;
}

// ─── Diff Types ──────────────────────────────────────────────────────────────

export interface DiffHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly content: string;
  readonly changes: readonly DiffChange[];
}

export interface DiffChange {
  readonly type: 'add' | 'remove' | 'unchanged';
  readonly line: number;
  readonly content: string;
  readonly oldLine?: number;
  readonly newLine?: number;
}

export interface FileDiff {
  readonly oldPath: string;
  readonly newPath: string;
  readonly oldHash: string;
  readonly newHash: string;
  readonly hunks: readonly DiffHunk[];
  readonly additions: number;
  readonly deletions: number;
  readonly isBinary: boolean;
}

// ─── Patch Types ─────────────────────────────────────────────────────────────

export interface Patch {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description: string;
  readonly diffs: readonly FileDiff[];
  readonly hash: string;
  readonly createdAt: Date;
  readonly metadata: Record<string, unknown>;
}

export interface PatchApplyResult {
  readonly success: boolean;
  readonly appliedFiles: readonly string[];
  readonly failedFiles: readonly { path: string; error: string }[];
  readonly conflicts: readonly { path: string; hunks: readonly number[] }[];
}

// ─── Backup Types ────────────────────────────────────────────────────────────

export interface Backup extends Timestamps {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly type: 'full' | 'incremental';
  readonly size: number;
  readonly compressedSize: number;
  readonly fileCount: number;
  readonly hash: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
  readonly storagePath: string;
  readonly metadata: Record<string, unknown>;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  engine: z.enum(['keyword', 'semantic', 'hybrid', 'regex', 'ast']),
  workspaceId: z.string().min(1),
  paths: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  filePattern: z.string().optional(),
  maxResults: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  caseSensitive: z.boolean().default(false),
  wholeWord: z.boolean().default(false),
  includeTests: z.boolean().default(true),
  symbolKind: z.string().optional(),
});

export const WriteFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  compress: z.boolean().default(false),
  atomic: z.boolean().default(true),
  createDirs: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateSnapshotSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const CreatePatchSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  oldSnapshotId: z.string().min(1),
  newSnapshotId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});
