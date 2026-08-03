/**
 * Multi-Agent Orchestrator — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Agent Types ─────────────────────────────────────────────────────────────

export type AgentRole =
  | 'planner' | 'researcher' | 'architect' | 'coder' | 'reviewer'
  | 'tester' | 'debugger' | 'documenter' | 'deployer' | 'security';

export type AgentStatus =
  | 'created' | 'initialized' | 'waiting' | 'running'
  | 'paused' | 'completed' | 'failed' | 'cancelled';

export type ExecutionMode = 'safe' | 'balanced' | 'aggressive' | 'autonomous';

export type WorkflowPattern = 'sequential' | 'parallel' | 'hierarchical' | 'consensus' | 'event-driven';

// ─── Agent State ─────────────────────────────────────────────────────────────

export interface AgentState extends Timestamps {
  readonly id: string;
  readonly role: AgentRole;
  readonly name: string;
  readonly status: AgentStatus;
  readonly context: AgentContext;
  readonly memory: AgentMemory;
  readonly tasks: readonly Task[];
  readonly currentTask: Task | null;
  readonly result: AgentResult | null;
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface AgentContext {
  readonly workflowId: string;
  readonly goalId: string;
  readonly parentAgentId: string | null;
  readonly childAgentIds: readonly string[];
  readonly executionMode: ExecutionMode;
  readonly maxIterations: number;
  readonly currentIteration: number;
  readonly workspaceId: string | null;
  readonly conversationId: string | null;
  readonly permissions: readonly ToolPermission[];
  readonly systemPrompt: string;
  readonly availableTools: readonly string[];
}

export interface AgentResult {
  readonly success: boolean;
  readonly output: string;
  readonly artifacts: readonly Artifact[];
  readonly tokenUsage: { prompt: number; completion: number; total: number };
  readonly durationMs: number;
  readonly iterations: number;
}

export interface Artifact {
  readonly type: 'file' | 'code' | 'text' | 'json' | 'image' | 'diff';
  readonly name: string;
  readonly content: string;
  readonly path: string | null;
  readonly mimeType: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled';

export interface Task extends Timestamps {
  readonly id: string;
  readonly goalId: string;
  readonly title: string;
  readonly description: string;
  readonly assignedAgentId: string | null;
  readonly status: TaskStatus;
  readonly priority: number;
  readonly dependencies: readonly string[];
  readonly input: string;
  readonly output: string | null;
  readonly artifacts: readonly Artifact[];
  readonly retries: number;
  readonly maxRetries: number;
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Goals & Workflows ───────────────────────────────────────────────────────

export type GoalStatus = 'planning' | 'executing' | 'validating' | 'correcting' | 'completed' | 'failed';

export interface Goal extends Timestamps {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: GoalStatus;
  readonly workflowPattern: WorkflowPattern;
  readonly executionMode: ExecutionMode;
  readonly tasks: readonly Task[];
  readonly agents: readonly AgentState[];
  readonly checkpoints: readonly Checkpoint[];
  readonly result: GoalResult | null;
  readonly maxIterations: number;
  readonly metadata: Record<string, unknown>;
}

export interface GoalResult {
  readonly success: boolean;
  readonly summary: string;
  readonly artifacts: readonly Artifact[];
  readonly totalDurationMs: number;
  readonly totalTokens: number;
  readonly taskStats: { completed: number; failed: number; total: number };
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly pattern: WorkflowPattern;
  readonly steps: readonly WorkflowStep[];
  readonly timeout: number;
  readonly maxRetries: number;
}

export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly agentRole: AgentRole;
  readonly input: string;
  readonly dependencies: readonly string[];
  readonly condition?: string;
  readonly retries: number;
  readonly timeout: number;
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export type MemoryLayer = 'session' | 'conversation' | 'semantic' | 'workspace' | 'global';

export interface AgentMemory {
  readonly session: Map<string, unknown>;
  readonly conversation: readonly ConversationMemoryEntry[];
  readonly semantic: readonly SemanticMemoryEntry[];
  readonly workspace: readonly WorkspaceMemoryEntry[];
  readonly global: readonly GlobalMemoryEntry[];
}

export interface ConversationMemoryEntry {
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: string;
  readonly timestamp: Date;
  readonly tokens: number;
}

export interface SemanticMemoryEntry {
  readonly content: string;
  readonly embedding: readonly number[];
  readonly relevance: number;
  readonly source: string;
  readonly timestamp: Date;
}

export interface WorkspaceMemoryEntry {
  readonly filePath: string;
  readonly summary: string;
  readonly symbols: readonly string[];
  readonly lastModified: Date;
}

export interface GlobalMemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly importance: number;
  readonly timestamp: Date;
}

// ─── Checkpoints ─────────────────────────────────────────────────────────────

export interface Checkpoint extends Timestamps {
  readonly id: string;
  readonly goalId: string;
  readonly name: string;
  readonly description: string;
  readonly state: {
    readonly goal: Goal;
    readonly agents: readonly AgentState[];
    readonly tasks: readonly Task[];
  };
  readonly hash: string;
  readonly metadata: Record<string, unknown>;
}

// ─── Communication ───────────────────────────────────────────────────────────

export interface AgentMessage {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly channel: string;
  readonly type: 'request' | 'response' | 'broadcast' | 'delegation' | 'feedback';
  readonly payload: unknown;
  readonly timestamp: Date;
  readonly replyTo: string | null;
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type ToolPermission =
  | 'filesystem.read' | 'filesystem.write' | 'filesystem.delete'
  | 'shell.execute'
  | 'git.commit' | 'git.push'
  | 'browser.open'
  | 'network.request';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(10_000),
  executionMode: z.enum(['safe', 'balanced', 'aggressive', 'autonomous']).default('balanced'),
  workflowPattern: z.enum(['sequential', 'parallel', 'hierarchical', 'consensus', 'event-driven']).default('sequential'),
  workspaceId: z.string().optional(),
  conversationId: z.string().optional(),
  maxIterations: z.number().int().positive().max(100).default(20),
  permissions: z.array(z.string()).default(['filesystem.read', 'filesystem.write', 'shell.execute']),
});

export const TaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(10_000),
  assignedAgentRole: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  dependencies: z.array(z.string()).default([]),
  input: z.string().default(''),
});
