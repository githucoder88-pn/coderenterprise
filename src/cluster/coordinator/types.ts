/**
 * Distributed Agent Platform — Types
 */

import { z } from 'zod';
import type { Timestamps } from '../../types/index.js';

// ─── Regions ─────────────────────────────────────────────────────────────────

export type RegionId = 'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'ap-south' | 'ap-east';

export interface Region extends Timestamps {
  readonly id: RegionId;
  readonly name: string;
  readonly endpoint: string;
  readonly status: 'active' | 'degraded' | 'offline';
  readonly nodes: readonly DistributedNode[];
  readonly metadata: Record<string, unknown>;
}

// ─── Distributed Node ────────────────────────────────────────────────────────

export type NodeLifecycle = 'registering' | 'available' | 'allocated' | 'executing' | 'paused' | 'terminated';

export interface DistributedNode extends Timestamps {
  readonly id: string;
  readonly regionId: RegionId;
  readonly hostname: string;
  readonly ip: string;
  readonly port: number;
  readonly lifecycle: NodeLifecycle;
  readonly capabilities: NodeCapabilities;
  readonly resources: NodeResources;
  readonly lastHeartbeat: Date;
  readonly metadata: Record<string, unknown>;
}

export interface NodeCapabilities {
  readonly maxConcurrentAgents: number;
  readonly supportedLanguages: readonly string[];
  readonly hasGpu: boolean;
  readonly hasNetwork: boolean;
  readonly hasTerminal: boolean;
}

export interface NodeResources {
  readonly cpu: { cores: number; usage: number };
  readonly memory: { total: number; used: number; percent: number };
  readonly disk: { total: number; used: number; percent: number };
  readonly network: { bandwidthMbps: number; latencyMs: number };
  readonly activeAgents: number;
  readonly queuedTasks: number;
}

// ─── Distributed Agent ───────────────────────────────────────────────────────

export type AgentLifecycle = 'created' | 'queued' | 'running' | 'migrating' | 'waiting' | 'failed' | 'completed';

export interface DistributedAgent extends Timestamps {
  readonly id: string;
  readonly role: string;
  readonly nodeId: string | null;
  readonly regionId: RegionId | null;
  readonly lifecycle: AgentLifecycle;
  readonly goal: string;
  readonly tasks: readonly DistributedTask[];
  readonly currentTaskId: string | null;
  readonly checkpointId: string | null;
  readonly memory: DistributedMemory;
  readonly resourceUsage: { cpuMs: number; memoryMb: number; tokensUsed: number };
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface DistributedTask extends Timestamps {
  readonly id: string;
  readonly agentId: string;
  readonly goalId: string;
  readonly name: string;
  readonly description: string;
  readonly status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'migrating';
  readonly priority: number;
  readonly input: string;
  readonly output: string | null;
  readonly nodeId: string | null;
  readonly regionId: RegionId | null;
  readonly retries: number;
  readonly maxRetries: number;
  readonly checkpointId: string | null;
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Distributed Memory ──────────────────────────────────────────────────────

export type MemoryScope = 'short_term' | 'long_term' | 'shared' | 'semantic' | 'workspace';

export interface DistributedMemory {
  readonly agentId: string;
  readonly scope: MemoryScope;
  readonly entries: readonly MemoryEntry[];
  readonly syncStatus: 'synced' | 'pending' | 'conflict';
  readonly lastSyncedAt: Date | null;
}

export interface MemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly scope: MemoryScope;
  readonly regionId: RegionId;
  readonly version: number;
  readonly timestamp: Date;
  readonly ttl: number | null;
}

// ─── Distributed Checkpoint ──────────────────────────────────────────────────

export interface DistributedCheckpoint extends Timestamps {
  readonly id: string;
  readonly agentId: string;
  readonly goalId: string;
  readonly regionId: RegionId;
  readonly nodeId: string;
  readonly state: {
    readonly agent: DistributedAgent;
    readonly memory: DistributedMemory;
    readonly taskState: Record<string, unknown>;
  };
  readonly hash: string;
  readonly size: number;
  readonly metadata: Record<string, unknown>;
}

// ─── Distributed Queue ───────────────────────────────────────────────────────

export type DistributedQueueName =
  | 'conversation-queue' | 'agent-queue' | 'tool-queue'
  | 'indexing-queue' | 'telemetry-queue' | 'embedding-queue' | 'workflow-queue';

export interface DistributedJob<T = unknown> extends Timestamps {
  readonly id: string;
  readonly queue: DistributedQueueName;
  readonly name: string;
  readonly data: T;
  readonly status: 'pending' | 'active' | 'completed' | 'failed' | 'migrating' | 'dead';
  readonly priority: number;
  readonly regionId: RegionId;
  readonly nodeId: string | null;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly result: unknown;
  readonly error: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Coordinator Message ─────────────────────────────────────────────────────

export type MessageType =
  | 'heartbeat' | 'task_assign' | 'task_complete' | 'task_fail'
  | 'agent_migrate' | 'checkpoint_sync' | 'memory_sync'
  | 'node_register' | 'node_deregister' | 'region_health'
  | 'scale_request' | 'scale_response';

export interface CoordinatorMessage {
  readonly id: string;
  readonly type: MessageType;
  readonly from: string;
  readonly to: string;
  readonly payload: unknown;
  readonly timestamp: Date;
  readonly correlationId: string | null;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface ClusterHealth {
  readonly global: 'healthy' | 'degraded' | 'critical';
  readonly regions: readonly {
    readonly id: RegionId;
    readonly status: 'healthy' | 'degraded' | 'offline';
    readonly nodes: number;
    readonly healthyNodes: number;
    readonly activeAgents: number;
    readonly cpuAvg: number;
    readonly memoryAvg: number;
  }[];
  readonly totalNodes: number;
  readonly totalHealthyNodes: number;
  readonly totalActiveAgents: number;
  readonly totalQueuedTasks: number;
  readonly timestamp: string;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ScheduleAgentSchema = z.object({
  role: z.string().min(1),
  goal: z.string().min(1).max(10_000),
  region: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  maxRetries: z.number().int().min(0).max(10).default(3),
  metadata: z.record(z.unknown()).optional(),
});
