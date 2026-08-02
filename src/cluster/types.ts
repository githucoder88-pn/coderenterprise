/**
 * Cloud Execution Platform — Distributed Types
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Queue Names ─────────────────────────────────────────────────────────────

export type QueueName =
  | 'chat' | 'workflow' | 'agent' | 'embedding' | 'search'
  | 'tool' | 'indexing' | 'telemetry' | 'notification' | 'billing';

// ─── Job ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed' | 'stalled' | 'cancelled';

export interface Job<T = unknown> extends Timestamps {
  readonly id: string;
  readonly queue: QueueName;
  readonly name: string;
  readonly data: T;
  readonly status: JobStatus;
  readonly priority: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly delay: number;
  readonly processedAt: Date | null;
  readonly completedAt: Date | null;
  readonly failedAt: Date | null;
  readonly result: unknown;
  readonly error: string | null;
  readonly workerId: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export type WorkerStatus = 'idle' | 'busy' | 'paused' | 'stopped' | 'error';

export interface WorkerInfo extends Timestamps {
  readonly id: string;
  readonly hostname: string;
  readonly pid: number;
  readonly status: WorkerStatus;
  readonly queues: readonly QueueName[];
  readonly concurrency: number;
  readonly activeJobs: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly uptime: number;
  readonly lastHeartbeat: Date;
  readonly metadata: Record<string, unknown>;
}

// ─── Cluster Node ────────────────────────────────────────────────────────────

export type NodeStatus = 'healthy' | 'degraded' | 'unhealthy' | 'draining' | 'offline';

export interface ClusterNode extends Timestamps {
  readonly id: string;
  readonly hostname: string;
  readonly ip: string;
  readonly port: number;
  readonly status: NodeStatus;
  readonly role: 'primary' | 'secondary' | 'worker';
  readonly workers: readonly WorkerInfo[];
  readonly cpu: { cores: number; usage: number };
  readonly memory: { total: number; used: number; percent: number };
  readonly load: { m1: number; m5: number; m15: number };
  readonly lastHeartbeat: Date;
  readonly metadata: Record<string, unknown>;
}

// ─── Event ───────────────────────────────────────────────────────────────────

export type SystemEventName =
  | 'task.created' | 'task.assigned' | 'task.started' | 'task.completed' | 'task.failed'
  | 'agent.created' | 'agent.updated' | 'agent.destroyed'
  | 'checkpoint.created' | 'checkpoint.restored'
  | 'worker.started' | 'worker.stopped' | 'worker.error'
  | 'node.joined' | 'node.left' | 'node.unhealthy'
  | 'queue.backpressure' | 'queue.empty'
  | 'scaling.up' | 'scaling.down';

export interface SystemEvent<T = unknown> {
  readonly id: string;
  readonly name: SystemEventName;
  readonly source: string;
  readonly data: T;
  readonly timestamp: Date;
  readonly correlationId: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Scaling ─────────────────────────────────────────────────────────────────

export interface ScalingPolicy {
  readonly metric: 'cpu' | 'memory' | 'queue_length' | 'latency' | 'request_count';
  readonly threshold: number;
  readonly direction: 'up' | 'down';
  readonly cooldownMs: number;
  readonly stepSize: number;
  readonly minInstances: number;
  readonly maxInstances: number;
}

export interface ScalingDecision {
  readonly currentInstances: number;
  readonly desiredInstances: number;
  readonly reason: string;
  readonly metric: string;
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: Date;
}

// ─── Load Balancer ───────────────────────────────────────────────────────────

export type LoadBalancingStrategy = 'round-robin' | 'weighted' | 'least-connections' | 'failover';

export interface LoadBalancerConfig {
  readonly strategy: LoadBalancingStrategy;
  readonly healthCheckIntervalMs: number;
  readonly unhealthyThreshold: number;
  readonly healthyThreshold: number;
  readonly weights?: Record<string, number>;
  readonly stickySession?: boolean;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const EnqueueJobSchema = z.object({
  queue: z.enum(['chat', 'workflow', 'agent', 'embedding', 'search', 'tool', 'indexing', 'telemetry', 'notification', 'billing']),
  name: z.string().min(1),
  data: z.unknown(),
  priority: z.number().int().min(0).max(100).default(50),
  delay: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  metadata: z.record(z.unknown()).optional(),
});
