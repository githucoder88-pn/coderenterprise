/**
 * Autonomous Runtime — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Execution Modes ─────────────────────────────────────────────────────────

export type ExecutionMode = 'interactive' | 'supervised' | 'automatic' | 'autonomous';

// ─── Workflow ────────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | 'draft' | 'planning' | 'awaiting_approval' | 'executing'
  | 'paused' | 'correcting' | 'completed' | 'failed' | 'cancelled';

export interface Workflow extends Timestamps {
  readonly id: string;
  readonly goal: string;
  readonly status: WorkflowStatus;
  readonly mode: ExecutionMode;
  readonly plan: ExecutionPlan | null;
  readonly tasks: readonly RuntimeTask[];
  readonly currentTaskIndex: number;
  readonly checkpoints: readonly string[];
  readonly approvalRequired: boolean;
  readonly result: WorkflowResult | null;
  readonly error: string | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly metadata: Record<string, unknown>;
}

export interface ExecutionPlan {
  readonly steps: readonly PlanStep[];
  readonly estimatedDurationMs: number;
  readonly estimatedTokens: number;
  readonly requiredAgents: readonly string[];
  readonly requiredTools: readonly string[];
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface PlanStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly agentRole: string;
  readonly toolIds: readonly string[];
  readonly dependencies: readonly string[];
  readonly estimatedDurationMs: number;
  readonly requiresApproval: boolean;
}

export interface WorkflowResult {
  readonly success: boolean;
  readonly summary: string;
  readonly artifacts: readonly { name: string; type: string; path: string | null; content: string }[];
  readonly totalDurationMs: number;
  readonly totalTokens: number;
  readonly tasksCompleted: number;
  readonly tasksFailed: number;
  readonly approvalsGranted: number;
  readonly correctionsApplied: number;
}

// ─── Runtime Task ────────────────────────────────────────────────────────────

export type RuntimeTaskStatus =
  | 'pending' | 'planning' | 'awaiting_approval' | 'queued'
  | 'running' | 'validating' | 'correcting' | 'completed' | 'failed' | 'skipped';

export interface RuntimeTask extends Timestamps {
  readonly id: string;
  readonly workflowId: string;
  readonly stepId: string;
  readonly name: string;
  readonly description: string;
  readonly agentRole: string;
  readonly status: RuntimeTaskStatus;
  readonly input: string;
  readonly output: string | null;
  readonly validation: TaskValidation | null;
  readonly correctionAttempts: number;
  readonly maxCorrections: number;
  readonly approvalId: string | null;
  readonly checkpointId: string | null;
  readonly toolInvocations: readonly ToolInvocation[];
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface TaskValidation {
  readonly passed: boolean;
  readonly checks: readonly { name: string; passed: boolean; message: string }[];
  readonly score: number;
  readonly validatedAt: Date;
}

export interface ToolInvocation {
  readonly toolId: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly durationMs: number;
  readonly success: boolean;
}

// ─── Approval ────────────────────────────────────────────────────────────────

export type ApprovalType = 'human' | 'automatic' | 'rule_based' | 'organization';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'escalated';

export interface ApprovalRequest extends Timestamps {
  readonly id: string;
  readonly workflowId: string;
  readonly taskId: string | null;
  readonly type: ApprovalType;
  readonly status: ApprovalStatus;
  readonly title: string;
  readonly description: string;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly requestedBy: string;
  readonly approvedBy: string | null;
  readonly reason: string | null;
  readonly expiresAt: Date;
  readonly metadata: Record<string, unknown>;
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export type PolicyDomain = 'filesystem' | 'network' | 'provider' | 'billing' | 'security' | 'deployment';

export interface RuntimePolicy extends Timestamps {
  readonly id: string;
  readonly domain: PolicyDomain;
  readonly name: string;
  readonly rules: readonly PolicyRule[];
  readonly enabled: boolean;
}

export interface PolicyRule {
  readonly effect: 'allow' | 'deny' | 'require_approval';
  readonly action: string;
  readonly resource: string;
  readonly conditions: Record<string, unknown> | null;
}

// ─── Memory Layers ───────────────────────────────────────────────────────────

export type MemoryLayer = 'working' | 'episodic' | 'semantic' | 'workspace' | 'organizational';

export interface RuntimeMemory {
  readonly layer: MemoryLayer;
  readonly entries: readonly MemoryEntry[];
  readonly maxEntries: number;
  readonly ttlMs: number | null;
}

export interface MemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly importance: number;
  readonly accessCount: number;
  readonly createdAt: Date;
  readonly lastAccessedAt: Date;
  readonly expiresAt: Date | null;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const StartWorkflowSchema = z.object({
  goal: z.string().min(1).max(10_000),
  mode: z.enum(['interactive', 'supervised', 'automatic', 'autonomous']).default('supervised'),
  maxRetries: z.number().int().min(0).max(10).default(3),
  approvalRequired: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const ApproveRequestSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(1000).optional(),
});
