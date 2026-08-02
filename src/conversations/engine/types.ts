/**
 * Conversation & Orchestration Engine — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';
import type { ProviderName, StreamChunk, ToolCall as ProviderToolCall } from '../../modules/providers/types.js';

// ─── Conversation ────────────────────────────────────────────────────────────

export interface Conversation extends Timestamps {
  readonly id: string;
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly title: string;
  readonly model: string;
  readonly provider: ProviderName;
  readonly systemPrompt: string | null;
  readonly messageCount: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly branchingEnabled: boolean;
  readonly currentBranchId: string;
  readonly metadata: Record<string, unknown>;
  readonly lastMessageAt: Date | null;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'context';

export interface Message extends Timestamps {
  readonly id: string;
  readonly conversationId: string;
  readonly branchId: string;
  readonly parentId: string | null;
  readonly role: MessageRole;
  readonly content: string;
  readonly contentType: 'text' | 'markdown' | 'code' | 'json';
  readonly attachments: readonly Attachment[];
  readonly toolCalls: readonly MessageToolCall[];
  readonly toolResults: readonly ToolResult[];
  readonly tokenUsage: TokenUsage | null;
  readonly version: number;
  readonly versions: readonly MessageVersion[];
  readonly status: 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  readonly error: string | null;
  readonly rating: 'good' | 'bad' | null;
  readonly feedback: string | null;
  readonly metadata: Record<string, unknown>;
  readonly sequenceNumber: number;
  readonly isEdited: boolean;
  readonly editHistory: readonly { content: string; editedAt: Date }[];
}

export interface MessageVersion {
  readonly version: number;
  readonly content: string;
  readonly createdAt: Date;
  readonly tokenUsage: TokenUsage | null;
}

export interface MessageToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly result: string | null;
  readonly durationMs: number | null;
  readonly error: string | null;
}

export interface ToolResult {
  readonly toolCallId: string;
  readonly name: string;
  readonly result: string;
  readonly isError: boolean;
  readonly durationMs: number;
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'audio' | 'file' | 'code' | 'url';

export interface Attachment extends Timestamps {
  readonly id: string;
  readonly messageId: string;
  readonly type: AttachmentType;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly url: string | null;
  readonly base64Data: string | null;
  readonly textContent: string | null;
  readonly metadata: Record<string, unknown>;
  readonly processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  readonly dimensions?: { width: number; height: number };
  readonly duration?: number; // for audio/video in seconds
}

// ─── Token Usage ─────────────────────────────────────────────────────────────

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly cost: number;
  readonly model: string;
  readonly provider: ProviderName;
}

// ─── Context Window ──────────────────────────────────────────────────────────

export interface ContextWindow {
  readonly maxTokens: number;
  readonly usedTokens: number;
  readonly remainingTokens: number;
  readonly messages: readonly ContextMessage[];
  readonly systemPrompt: string;
  readonly workspaceContext: string | null;
  readonly memoryContext: string | null;
  readonly compactionApplied: boolean;
  readonly truncationApplied: boolean;
}

export interface ContextMessage {
  readonly role: MessageRole;
  readonly content: string;
  readonly tokenEstimate: number;
  readonly priority: number; // 0-100, higher = more important
  readonly isCompacted: boolean;
  readonly originalMessageId: string | null;
}

// ─── Stream ──────────────────────────────────────────────────────────────────

export interface ConversationStream {
  readonly id: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly status: 'connecting' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  readonly chunks: readonly StreamChunk[];
  readonly content: string;
  readonly toolCalls: readonly MessageToolCall[];
  readonly usage: TokenUsage | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly durationMs: number | null;
  abort(): void;
  [Symbol.asyncIterator](): AsyncIterator<StreamChunk>;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session extends Timestamps {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly conversationId: string | null;
  readonly workspaceId: string;
  readonly title: string;
  readonly status: 'active' | 'expired' | 'closed';
  readonly contextSnapshot: ContextWindow | null;
  readonly messageCount: number;
  readonly totalTokens: number;
  readonly lastActivityAt: Date;
  readonly expiresAt: Date;
  readonly metadata: Record<string, unknown>;
}

// ─── Checkpoint ──────────────────────────────────────────────────────────────

export interface Checkpoint extends Timestamps {
  readonly id: string;
  readonly conversationId: string;
  readonly branchId: string;
  readonly name: string;
  readonly description: string;
  readonly messageSnapshot: readonly string[]; // message IDs in order
  readonly contextSnapshot: ContextWindow;
  readonly tokenUsageSnapshot: TokenUsage;
  readonly metadata: Record<string, unknown>;
}

// ─── Branch ──────────────────────────────────────────────────────────────────

export interface Branch extends Timestamps {
  readonly id: string;
  readonly conversationId: string;
  readonly name: string;
  readonly parentBranchId: string | null;
  readonly forkMessageId: string; // message where this branch diverges
  readonly messageCount: number;
  readonly isActive: boolean;
  readonly metadata: Record<string, unknown>;
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export type MemoryType = 'short_term' | 'long_term' | 'episodic' | 'semantic';

export interface MemoryEntry extends Timestamps {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly conversationId: string | null;
  readonly type: MemoryType;
  readonly content: string;
  readonly summary: string | null;
  readonly importance: number; // 0-100
  readonly accessCount: number;
  readonly lastAccessedAt: Date | null;
  readonly embedding: readonly number[] | null;
  readonly tags: readonly string[];
  readonly expiresAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export interface MemoryQuery {
  readonly userId: string;
  readonly organizationId: string;
  readonly query: string;
  readonly type?: MemoryType;
  readonly maxResults?: number;
  readonly minImportance?: number;
  readonly tags?: readonly string[];
}

// ─── Prompt Template ─────────────────────────────────────────────────────────

export interface PromptTemplate extends Timestamps {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly template: string;
  readonly variables: readonly PromptVariable[];
  readonly category: string;
  readonly tags: readonly string[];
  readonly version: number;
  readonly isPublic: boolean;
  readonly usageCount: number;
  readonly rating: number;
  readonly metadata: Record<string, unknown>;
}

export interface PromptVariable {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly required: boolean;
  readonly defaultValue: string | null;
  readonly validation: string | null; // regex or function name
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface OrchestrationRequest {
  readonly conversationId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly message: string;
  readonly attachments?: readonly { type: AttachmentType; data: string; mimeType: string; name: string }[];
  readonly model?: string;
  readonly provider?: ProviderName;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stream?: boolean;
  readonly tools?: readonly { name: string; description: string; parameters: Record<string, unknown> }[];
  readonly contextOverrides?: {
    readonly includeMemory?: boolean;
    readonly includeWorkspace?: boolean;
    readonly includeHistory?: boolean;
    readonly maxHistoryMessages?: number;
    readonly compactionStrategy?: 'truncate' | 'summarize' | 'smart';
  };
  readonly metadata?: Record<string, unknown>;
}

export interface OrchestrationResult {
  readonly conversationId: string;
  readonly messageId: string;
  readonly stream?: ConversationStream;
  readonly response?: string;
  readonly toolCalls: readonly MessageToolCall[];
  readonly usage: TokenUsage;
  readonly context: ContextWindow;
  readonly durationMs: number;
  readonly provider: ProviderName;
  readonly model: string;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateConversationSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().max(200).optional(),
  model: z.string().min(1),
  provider: z.string().min(1),
  systemPrompt: z.string().max(100_000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(1_000_000),
  contentType: z.enum(['text', 'markdown', 'code', 'json']).default('text'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'audio', 'file', 'code', 'url']),
    data: z.string(),
    mimeType: z.string(),
    name: z.string(),
  })).optional(),
  parentMessageId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().default(true),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(1_000_000),
  createBranch: z.boolean().default(false),
});

export const CreateCheckpointSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
});

export const CreateBranchSchema = z.object({
  name: z.string().min(1).max(200),
  forkMessageId: z.string().min(1),
});

export const MemoryStoreSchema = z.object({
  content: z.string().min(1).max(100_000),
  type: z.enum(['short_term', 'long_term', 'episodic', 'semantic']).default('long_term'),
  importance: z.number().int().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
  conversationId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});
