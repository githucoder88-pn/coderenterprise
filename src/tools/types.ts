/**
 * Tool Execution Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Tool Interface ──────────────────────────────────────────────────────────

export type ToolCategory = 'filesystem' | 'shell' | 'git' | 'search' | 'browser' | 'mcp' | 'docker';
export type ToolStatus = 'available' | 'busy' | 'disabled' | 'error';

export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly permissions: readonly string[];
  readonly timeout: number;
  readonly requiresConfirmation: boolean;
  readonly dangerous: boolean;
  readonly metadata: Record<string, unknown>;
}

export interface ToolExecutionContext {
  readonly executionId: string;
  readonly toolId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly conversationId: string | null;
  readonly workspaceId: string | null;
  readonly workingDirectory: string;
  readonly environment: Record<string, string>;
  readonly timeout: number;
  readonly dryRun: boolean;
}

export interface ToolExecutionResult {
  readonly executionId: string;
  readonly toolId: string;
  readonly success: boolean;
  readonly output: unknown;
  readonly error: string | null;
  readonly durationMs: number;
  readonly tokensUsed: number;
  readonly metadata: Record<string, unknown>;
  readonly artifacts: readonly ToolArtifact[];
}

export interface ToolArtifact {
  readonly type: 'file' | 'image' | 'text' | 'json' | 'binary';
  readonly name: string;
  readonly path: string | null;
  readonly content: string | null;
  readonly mimeType: string;
  readonly size: number;
}

export interface ToolExecution extends Timestamps {
  readonly id: string;
  readonly toolId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly conversationId: string | null;
  readonly input: unknown;
  readonly output: unknown;
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  readonly error: string | null;
  readonly durationMs: number;
  readonly metadata: Record<string, unknown>;
}

export interface Tool<TInput = unknown, _TOutput = unknown> {
  readonly definition: ToolDefinition;
  execute(input: TInput, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  validate?(input: TInput): { valid: boolean; errors: readonly string[] };
  abort?(executionId: string): void;
}

// ─── Filesystem Types ────────────────────────────────────────────────────────

export const CreateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  overwrite: z.boolean().default(false),
});

export const ReadFileSchema = z.object({
  path: z.string().min(1),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().positive().optional(),
});

export const UpdateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  replacements: z.array(z.object({
    search: z.string(),
    replace: z.string(),
    all: z.boolean().default(false),
  })).optional(),
  append: z.string().optional(),
});

export const DeleteFileSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().default(false),
});

export const RenameFileSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

export const MoveFileSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  overwrite: z.boolean().default(false),
});

export const CopyFileSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  overwrite: z.boolean().default(false),
});

// ─── Shell Types ─────────────────────────────────────────────────────────────

export const ExecuteCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().int().positive().default(30_000),
  stdin: z.string().optional(),
});

// ─── Git Types ───────────────────────────────────────────────────────────────

export const GitStatusSchema = z.object({
  path: z.string().default('.'),
  untracked: z.boolean().default(true),
});

export const GitCommitSchema = z.object({
  message: z.string().min(1),
  files: z.array(z.string()).optional(),
  all: z.boolean().default(false),
  amend: z.boolean().default(false),
});

export const GitBranchSchema = z.object({
  name: z.string().min(1),
  checkout: z.boolean().default(false),
  startPoint: z.string().optional(),
});

export const GitDiffSchema = z.object({
  files: z.array(z.string()).optional(),
  staged: z.boolean().default(false),
  commit: z.string().optional(),
});

// ─── Search Types ────────────────────────────────────────────────────────────

export const SearchSchema = z.object({
  query: z.string().min(1),
  paths: z.array(z.string()).default(['.']),
  include: z.string().optional(),
  exclude: z.string().optional(),
  caseSensitive: z.boolean().default(false),
  maxResults: z.number().int().positive().default(100),
});

export const GlobSchema = z.object({
  pattern: z.string().min(1),
  cwd: z.string().default('.'),
  ignore: z.array(z.string()).default([]),
  maxResults: z.number().int().positive().default(1000),
});

// ─── Browser Types ───────────────────────────────────────────────────────────

export const BrowserOpenSchema = z.object({
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).default('load'),
  timeout: z.number().int().positive().default(30_000),
});

export const BrowserScrapeSchema = z.object({
  url: z.string().url(),
  selector: z.string().optional(),
  extract: z.enum(['text', 'html', 'links', 'images']).default('text'),
  waitFor: z.string().optional(),
});

export const BrowserScreenshotSchema = z.object({
  url: z.string().url(),
  fullPage: z.boolean().default(false),
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().int().min(0).max(100).optional(),
});

// ─── Docker Types ────────────────────────────────────────────────────────────

export const DockerRunSchema = z.object({
  image: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  ports: z.array(z.string()).default([]),
  volumes: z.array(z.string()).default([]),
  workingDir: z.string().optional(),
  timeout: z.number().int().positive().default(60_000),
  remove: z.boolean().default(true),
});

// ─── MCP Types ───────────────────────────────────────────────────────────────

export interface McpServerConfig {
  readonly id: string;
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Record<string, string>;
  readonly transport: 'stdio' | 'sse';
  readonly url?: string;
}

export interface McpToolDefinition {
  readonly serverId: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const McpExecuteSchema = z.object({
  serverId: z.string().min(1),
  toolName: z.string().min(1),
  input: z.record(z.unknown()),
});

// ─── Tool Registry Types ─────────────────────────────────────────────────────

export interface ToolRegistryEntry {
  readonly tool: Tool;
  readonly registeredAt: Date;
  readonly enabled: boolean;
  readonly executionCount: number;
  readonly lastExecutedAt: Date | null;
  readonly averageDurationMs: number;
  readonly errorRate: number;
}

export interface ToolRegistryStats {
  readonly totalTools: number;
  readonly enabledTools: number;
  readonly totalExecutions: number;
  readonly byCategory: Record<ToolCategory, number>;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export type CreateFileInput = z.infer<typeof CreateFileSchema>;
export type ReadFileInput = z.infer<typeof ReadFileSchema>;
export type UpdateFileInput = z.infer<typeof UpdateFileSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
export type RenameFileInput = z.infer<typeof RenameFileSchema>;
export type ExecuteCommandInput = z.infer<typeof ExecuteCommandSchema>;
export type GitStatusInput = z.infer<typeof GitStatusSchema>;
export type GitCommitInput = z.infer<typeof GitCommitSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type GlobInput = z.infer<typeof GlobSchema>;
