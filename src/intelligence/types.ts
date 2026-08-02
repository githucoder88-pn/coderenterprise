/**
 * Intelligence Layer — Core Types
 *
 * The central nervous system of CODER.
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Reasoning Strategies ────────────────────────────────────────────────────

export type ReasoningStrategy =
  | 'sequential' | 'tree' | 'graph' | 'hierarchical' | 'consensus' | 'recursive';

// ─── Goal ────────────────────────────────────────────────────────────────────

export interface IntelligenceGoal extends Timestamps {
  readonly id: string;
  readonly description: string;
  readonly priority: number;
  readonly constraints: readonly Constraint[];
  readonly successCriteria: readonly string[];
  readonly context: Record<string, unknown>;
  readonly status: 'pending' | 'analyzing' | 'planning' | 'executing' | 'evaluating' | 'reflecting' | 'completed' | 'failed';
}

export interface Constraint {
  readonly type: 'token_budget' | 'time_limit' | 'cost_limit' | 'security' | 'resource' | 'permission';
  readonly value: number | string;
  readonly hard: boolean;
}

// ─── Reasoning ───────────────────────────────────────────────────────────────

export interface ReasoningStep {
  readonly id: string;
  readonly type: 'analysis' | 'decomposition' | 'inference' | 'synthesis' | 'evaluation';
  readonly input: string;
  readonly output: string;
  readonly confidence: number;
  readonly durationMs: number;
  readonly tokensUsed: number;
}

export interface ReasoningResult {
  readonly goalId: string;
  readonly strategy: ReasoningStrategy;
  readonly steps: readonly ReasoningStep[];
  readonly conclusion: string;
  readonly confidence: number;
  readonly totalTokens: number;
  readonly totalDurationMs: number;
}

// ─── Plan ────────────────────────────────────────────────────────────────────

export interface Plan {
  readonly id: string;
  readonly goalId: string;
  readonly strategy: ReasoningStrategy;
  readonly steps: readonly PlanStep[];
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly estimatedCost: number;
  readonly riskScore: number;
  readonly confidence: number;
  readonly alternatives: readonly Plan[];
}

export interface PlanStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly agentRole: string;
  readonly toolIds: readonly string[];
  readonly dependencies: readonly string[];
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly requiresApproval: boolean;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly fallback: string | null;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

export interface EvaluationScore {
  readonly dimension: string;
  readonly score: number; // 0-1
  readonly weight: number;
  readonly reasoning: string;
}

export interface EvaluationResult {
  readonly overall: number;
  readonly scores: readonly EvaluationScore[];
  readonly passed: boolean;
  readonly recommendations: readonly string[];
  readonly timestamp: Date;
}

// ─── Reflection ──────────────────────────────────────────────────────────────

export interface ReflectionEntry {
  readonly id: string;
  readonly goalId: string;
  readonly phase: 'pre_execution' | 'mid_execution' | 'post_execution' | 'failure_analysis';
  readonly observations: readonly string[];
  readonly lessons: readonly string[];
  readonly adjustments: readonly string[];
  readonly confidence: number;
  readonly timestamp: Date;
}

// ─── Optimization ────────────────────────────────────────────────────────────

export type OptimizationObjective = 'speed' | 'cost' | 'accuracy' | 'stability' | 'efficiency' | 'resource_usage';

export interface OptimizationResult {
  readonly objective: OptimizationObjective;
  readonly before: Record<string, number>;
  readonly after: Record<string, number>;
  readonly improvement: number;
  readonly recommendations: readonly string[];
}

// ─── Coordination ────────────────────────────────────────────────────────────

export interface CoordinationRequest {
  readonly goalId: string;
  readonly agents: readonly string[];
  readonly strategy: 'sequential' | 'parallel' | 'hierarchical' | 'consensus';
  readonly sharedMemory: boolean;
  readonly timeout: number;
}

export interface CoordinationResult {
  readonly goalId: string;
  readonly agentResults: readonly { agentId: string; output: string; success: boolean }[];
  readonly consensus: string | null;
  readonly totalDurationMs: number;
}

// ─── Telemetry ───────────────────────────────────────────────────────────────

export interface IntelligenceMetric {
  readonly name: string;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestamp: Date;
}

export interface IntelligenceTrace {
  readonly traceId: string;
  readonly goalId: string;
  readonly spans: readonly {
    readonly name: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly attributes: Record<string, unknown>;
  }[];
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ReasoningRequestSchema = z.object({
  goal: z.string().min(1).max(10_000),
  strategy: z.enum(['sequential', 'tree', 'graph', 'hierarchical', 'consensus', 'recursive']).default('sequential'),
  context: z.record(z.unknown()).optional(),
  constraints: z.array(z.object({
    type: z.enum(['token_budget', 'time_limit', 'cost_limit', 'security', 'resource', 'permission']),
    value: z.union([z.number(), z.string()]),
    hard: z.boolean().default(true),
  })).default([]),
  maxTokens: z.number().int().positive().default(100_000),
  maxDurationMs: z.number().int().positive().default(300_000),
});
