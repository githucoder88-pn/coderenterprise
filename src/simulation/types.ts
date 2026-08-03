/**
 * Simulation Platform — Core Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Environment ─────────────────────────────────────────────────────────────

export type Environment = 'development' | 'testing' | 'staging' | 'production' | 'sandbox' | 'offline' | 'hybrid';

// ─── Simulation ──────────────────────────────────────────────────────────────

export type SimulationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface SimulationResult {
  readonly simulationId: string;
  readonly totalScenarios: number;
  readonly completed: number;
  readonly failed: number;
  readonly averageScore: number;
  readonly totalDurationMs: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly scenarioResults: readonly { scenarioId: string; success: boolean; score: number; durationMs: number }[];
  readonly scores: Record<string, number>;
  readonly completedAt: Date;
}

export interface Simulation extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly environment: Environment;
  readonly status: SimulationStatus;
  readonly scenarioIds: readonly string[];
  readonly config: SimulationConfig;
  readonly results: SimulationResult | null;
  readonly metadata: Record<string, unknown>;
}

export interface SimulationConfig {
  readonly maxConcurrency: number;
  readonly timeout: number;
  readonly retries: number;
  readonly deterministic: boolean;
  readonly seed: number;
  readonly resourceLimits: {
    readonly maxTokens: number;
    readonly maxCost: number;
    readonly maxDurationMs: number;
  };
  readonly providers: readonly string[];
  readonly models: readonly string[];
}

// ─── Scenario ────────────────────────────────────────────────────────────────

export type ScenarioKind = 'unit' | 'integration' | 'e2e' | 'stress' | 'chaos' | 'load' | 'benchmark';

export interface Scenario extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: ScenarioKind;
  readonly category: string;
  readonly input: ScenarioInput;
  readonly expectedOutput: ScenarioExpected | null;
  readonly assertions: readonly ScenarioAssertion[];
  readonly tags: readonly string[];
  readonly difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  readonly metadata: Record<string, unknown>;
}

export interface ScenarioInput {
  readonly goal: string;
  readonly context: string;
  readonly tools: readonly string[];
  readonly attachments: readonly { name: string; content: string; type: string }[];
  readonly provider?: string;
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly constraints: Record<string, unknown>;
}

export interface ScenarioExpected {
  readonly contains?: readonly string[];
  readonly notContains?: readonly string[];
  readonly matches?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly format?: 'json' | 'code' | 'markdown' | 'text';
  readonly custom?: (output: string) => boolean;
}

export interface ScenarioAssertion {
  readonly type: 'output_match' | 'token_limit' | 'time_limit' | 'cost_limit' | 'tool_used' | 'no_error' | 'custom';
  readonly value?: unknown;
  readonly message: string;
}

// ─── Benchmark ───────────────────────────────────────────────────────────────

export type BenchmarkCategory =
  | 'coding' | 'reasoning' | 'tool_usage' | 'planning' | 'memory'
  | 'retrieval' | 'search_quality' | 'latency' | 'cost' | 'security';

export interface Benchmark extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly category: BenchmarkCategory;
  readonly description: string;
  readonly scenarios: readonly string[];
  readonly metrics: readonly string[];
  readonly baseline: BenchmarkBaseline | null;
  readonly metadata: Record<string, unknown>;
}

export interface BenchmarkBaseline {
  readonly provider: string;
  readonly model: string;
  readonly scores: Record<string, number>;
  readonly establishedAt: Date;
}

export interface BenchmarkResult {
  readonly benchmarkId: string;
  readonly runs: readonly BenchmarkRun[];
  readonly aggregate: BenchmarkAggregate;
  readonly comparison: BenchmarkComparison | null;
}

export interface BenchmarkRun {
  readonly scenarioId: string;
  readonly provider: string;
  readonly model: string;
  readonly output: string;
  readonly scores: Record<string, number>;
  readonly durationMs: number;
  readonly tokensUsed: number;
  readonly cost: number;
  readonly success: boolean;
  readonly error: string | null;
}

export interface BenchmarkAggregate {
  readonly totalScenarios: number;
  readonly passed: number;
  readonly failed: number;
  readonly averageScore: number;
  readonly medianLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly byCategory: Record<string, { score: number; count: number }>;
}

export interface BenchmarkComparison {
  readonly baseline: string;
  readonly current: string;
  readonly scoreDelta: number;
  readonly latencyDelta: number;
  readonly costDelta: number;
  readonly improved: readonly string[];
  readonly degraded: readonly string[];
}

// ─── Replay ──────────────────────────────────────────────────────────────────

export interface ReplaySession extends Timestamps {
  readonly id: string;
  readonly simulationId: string;
  readonly events: readonly ReplayEvent[];
  readonly duration: number;
  readonly status: 'recording' | 'recorded' | 'replaying' | 'completed';
  readonly metadata: Record<string, unknown>;
}

export interface ReplayEvent {
  readonly timestamp: number;
  readonly type: 'input' | 'output' | 'tool_call' | 'tool_result' | 'error' | 'checkpoint' | 'metric';
  readonly data: unknown;
  readonly sequenceNumber: number;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoreCard {
  readonly overall: number;
  readonly dimensions: readonly ScoreDimension[];
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly recommendations: readonly string[];
}

export interface ScoreDimension {
  readonly name: string;
  readonly score: number;
  readonly weight: number;
  readonly details: string;
}

// ─── Experiment ──────────────────────────────────────────────────────────────

export type ExperimentType = 'a_b' | 'multivariate' | 'provider_comparison' | 'workflow_comparison' | 'agent_comparison';

export interface Experiment extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly type: ExperimentType;
  readonly variants: readonly ExperimentVariant[];
  readonly scenarios: readonly string[];
  readonly status: 'draft' | 'running' | 'completed' | 'cancelled';
  readonly results: ExperimentResult | null;
  readonly metadata: Record<string, unknown>;
}

export interface ExperimentVariant {
  readonly id: string;
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly provider?: string;
  readonly model?: string;
  readonly weight: number;
}

export interface ExperimentResult {
  readonly winner: string;
  readonly confidence: number;
  readonly variants: readonly { id: string; scores: Record<string, number>; sampleSize: number }[];
  readonly statisticalSignificance: number;
}

// ─── Dataset ─────────────────────────────────────────────────────────────────

export type DatasetType = 'repository' | 'document' | 'source_code' | 'image' | 'conversation' | 'workflow' | 'prompt' | 'benchmark';

export interface Dataset extends Timestamps {
  readonly id: string;
  readonly name: string;
  readonly type: DatasetType;
  readonly description: string;
  readonly entries: number;
  readonly sizeBytes: number;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateSimulationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  environment: z.enum(['development', 'testing', 'staging', 'production', 'sandbox', 'offline', 'hybrid']).default('sandbox'),
  scenarioIds: z.array(z.string()).min(1),
  config: z.object({
    maxConcurrency: z.number().int().positive().default(5),
    timeout: z.number().int().positive().default(60_000),
    retries: z.number().int().min(0).default(2),
    deterministic: z.boolean().default(true),
    seed: z.number().int().default(42),
    resourceLimits: z.object({
      maxTokens: z.number().int().positive().default(1_000_000),
      maxCost: z.number().positive().default(100),
      maxDurationMs: z.number().int().positive().default(600_000),
    }).default({}),
    providers: z.array(z.string()).default([]),
    models: z.array(z.string()).default([]),
  }).default({}),
});

export const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  kind: z.enum(['unit', 'integration', 'e2e', 'stress', 'chaos', 'load', 'benchmark']).default('unit'),
  category: z.string().default('general'),
  input: z.object({
    goal: z.string().min(1),
    context: z.string().default(''),
    tools: z.array(z.string()).default([]),
    provider: z.string().optional(),
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    constraints: z.record(z.unknown()).default({}),
  }),
  expectedOutput: z.object({
    contains: z.array(z.string()).optional(),
    minLength: z.number().int().optional(),
    maxLength: z.number().int().optional(),
  }).optional(),
  assertions: z.array(z.object({
    type: z.enum(['output_match', 'token_limit', 'time_limit', 'cost_limit', 'tool_used', 'no_error', 'custom']),
    value: z.unknown(),
    message: z.string(),
  })).default([]),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
});

export const CreateBenchmarkSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['coding', 'reasoning', 'tool_usage', 'planning', 'memory', 'retrieval', 'search_quality', 'latency', 'cost', 'security']),
  description: z.string().max(2000).default(''),
  scenarioIds: z.array(z.string()).min(1),
  metrics: z.array(z.string()).default(['accuracy', 'speed', 'cost']),
});
