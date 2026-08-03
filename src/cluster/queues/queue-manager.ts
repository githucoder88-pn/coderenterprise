/**
 * Queue Manager
 *
 * Manages 10 named job queues with priority, delay, retries, and backpressure.
 * In-memory implementation with Redis-compatible interface for horizontal scaling.
 */

import type { QueueName, Job, JobStatus } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

interface QueueConfig {
  readonly maxConcurrency: number;
  readonly maxQueueSize: number;
  readonly defaultMaxAttempts: number;
  readonly stalledIntervalMs: number;
  readonly maxStalledCount: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrency: 10,
  maxQueueSize: 100_000,
  defaultMaxAttempts: 3,
  stalledIntervalMs: 30_000,
  maxStalledCount: 2,
};

export interface IQueueManager {
  enqueue<T>(queue: QueueName, name: string, data: T, options?: { priority?: number; delay?: number; maxAttempts?: number }): Promise<Job<T>>;
  dequeue(queue: QueueName): Promise<Job | null>;
  complete(jobId: string, result: unknown): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
  retry(jobId: string): Promise<void>;
  getJob(jobId: string): Promise<Job | null>;
  getJobs(queue: QueueName, status: JobStatus, limit?: number): Promise<readonly Job[]>;
  getQueueStats(queue: QueueName): Promise<{ pending: number; active: number; completed: number; failed: number; delayed: number }>;
  getAllStats(): Promise<Record<QueueName, { pending: number; active: number; completed: number; failed: number }>>;
  pause(queue: QueueName): Promise<void>;
  resume(queue: QueueName): Promise<void>;
  clean(queue: QueueName, olderThanMs: number): Promise<number>;
  process(queue: QueueName, handler: (job: Job) => Promise<unknown>): void;
}

export class QueueManager implements IQueueManager {
  private readonly queues = new Map<QueueName, Job[]>();
  private readonly jobs = new Map<string, Job>();
  private readonly handlers = new Map<QueueName, (job: Job) => Promise<unknown>>();
  private readonly paused = new Set<QueueName>();
  private readonly processing = new Map<QueueName, number>();
  private readonly config: QueueConfig;
  private readonly queueNames: QueueName[] = [
    'chat', 'workflow', 'agent', 'embedding', 'search',
    'tool', 'indexing', 'telemetry', 'notification', 'billing',
  ];

  constructor(
    private readonly logger: ILogger,
    config?: Partial<QueueConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    for (const name of this.queueNames) {
      this.queues.set(name, []);
      this.processing.set(name, 0);
    }
  }

  async enqueue<T>(
    queue: QueueName, name: string, data: T,
    options?: { priority?: number; delay?: number; maxAttempts?: number },
  ): Promise<Job<T>> {
    const q = this.queues.get(queue);
    if (!q) throw new Error(`Queue ${queue} not found`);

    if (q.length >= this.config.maxQueueSize) {
      this.logger.warn({ queue, size: q.length }, 'Queue backpressure detected');
      throw new QueueOverflowError(queue, this.config.maxQueueSize);
    }

    const now = new Date();
    const job: Job<T> = {
      id: nanoid(), queue, name, data,
      status: options?.delay ? 'delayed' : 'pending',
      priority: options?.priority ?? 50,
      attempts: 0, maxAttempts: options?.maxAttempts ?? this.config.defaultMaxAttempts,
      delay: options?.delay ?? 0,
      processedAt: null, completedAt: null, failedAt: null,
      result: null, error: null, workerId: null, metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.jobs.set(job.id, job);
    q.push(job as Job);
    this.sortQueue(queue);

    this.logger.debug({ jobId: job.id, queue, name, priority: job.priority }, 'Job enqueued');
    this.processQueue(queue);

    return job;
  }

  async dequeue(queue: QueueName): Promise<Job | null> {
    const q = this.queues.get(queue);
    if (!q || q.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < q.length; i++) {
      const job = q[i]!;
      if (job.status === 'delayed' && job.createdAt.getTime() + job.delay > now) continue;
      if (job.status === 'pending' || job.status === 'delayed') {
        const activeJob = { ...job, status: 'active' as const, processedAt: new Date(), updatedAt: new Date() };
        q.splice(i, 1);
        this.jobs.set(activeJob.id, activeJob);
        this.processing.set(queue, (this.processing.get(queue) ?? 0) + 1);
        return activeJob;
      }
    }
    return null;
  }

  async complete(jobId: string, result: unknown): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const updated = { ...job, status: 'completed' as const, result, completedAt: new Date(), updatedAt: new Date() };
    this.jobs.set(jobId, updated);
    this.processing.set(job.queue, Math.max(0, (this.processing.get(job.queue) ?? 1) - 1));
    this.processQueue(job.queue);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.attempts < job.maxAttempts - 1) {
      // Retry with exponential backoff
      const retryJob = {
        ...job, status: 'pending' as const, attempts: job.attempts + 1,
        delay: Math.min(30_000, 1000 * Math.pow(2, job.attempts)),
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, retryJob);
      this.queues.get(job.queue)?.push(retryJob);
      this.sortQueue(job.queue);
      this.logger.info({ jobId, attempt: retryJob.attempts }, 'Job retrying');
    } else {
      const failed = { ...job, status: 'failed' as const, error, failedAt: new Date(), updatedAt: new Date() };
      this.jobs.set(jobId, failed);
      this.logger.warn({ jobId, error }, 'Job failed permanently');
    }

    this.processing.set(job.queue, Math.max(0, (this.processing.get(job.queue) ?? 1) - 1));
    this.processQueue(job.queue);
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, { ...job, status: 'cancelled', updatedAt: new Date() });
    const q = this.queues.get(job.queue);
    if (q) {
      const idx = q.findIndex((j) => j.id === jobId);
      if (idx >= 0) q.splice(idx, 1);
    }
  }

  async retry(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const retryJob = { ...job, status: 'pending' as const, attempts: 0, error: null, updatedAt: new Date() };
    this.jobs.set(jobId, retryJob);
    this.queues.get(job.queue)?.push(retryJob);
    this.sortQueue(job.queue);
  }

  async getJob(jobId: string): Promise<Job | null> { return this.jobs.get(jobId) ?? null; }

  async getJobs(queue: QueueName, status: JobStatus, limit = 50): Promise<readonly Job[]> {
    return [...this.jobs.values()].filter((j) => j.queue === queue && j.status === status).slice(0, limit);
  }

  async getQueueStats(queue: QueueName): Promise<{ pending: number; active: number; completed: number; failed: number; delayed: number }> {
    const jobs = [...this.jobs.values()].filter((j) => j.queue === queue);
    return {
      pending: jobs.filter((j) => j.status === 'pending').length,
      active: jobs.filter((j) => j.status === 'active').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      delayed: jobs.filter((j) => j.status === 'delayed').length,
    };
  }

  async getAllStats(): Promise<Record<QueueName, { pending: number; active: number; completed: number; failed: number }>> {
    const stats = {} as Record<QueueName, { pending: number; active: number; completed: number; failed: number }>;
    for (const name of this.queueNames) {
      const s = await this.getQueueStats(name);
      stats[name] = { pending: s.pending, active: s.active, completed: s.completed, failed: s.failed };
    }
    return stats;
  }

  async pause(queue: QueueName): Promise<void> { this.paused.add(queue); }
  async resume(queue: QueueName): Promise<void> { this.paused.delete(queue); this.processQueue(queue); }

  async clean(queue: QueueName, olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;
    for (const [id, job] of this.jobs) {
      if (job.queue === queue && (job.status === 'completed' || job.status === 'failed') && job.updatedAt.getTime() < cutoff) {
        this.jobs.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  process(queue: QueueName, handler: (job: Job) => Promise<unknown>): void {
    this.handlers.set(queue, handler);
    this.processQueue(queue);
  }

  private processQueue(queue: QueueName): void {
    if (this.paused.has(queue)) return;
    const handler = this.handlers.get(queue);
    if (!handler) return;

    const concurrency = this.config.maxConcurrency;
    const active = this.processing.get(queue) ?? 0;

    while (active < concurrency) {
      const job = this.dequeue(queue) as any;
      if (!job) break;
      this.executeJob(queue, job, handler);
    }
  }

  private async executeJob(_queue: QueueName, job: Job, handler: (job: Job) => Promise<unknown>): Promise<void> {
    try {
      const result = await handler(job);
      await this.complete(job.id, result);
    } catch (error) {
      await this.fail(job.id, error instanceof Error ? error.message : String(error));
    }
  }

  private sortQueue(queue: QueueName): void {
    const q = this.queues.get(queue);
    if (q) q.sort((a, b) => b.priority - a.priority);
  }
}

export class QueueOverflowError extends Error {
  constructor(public readonly queue: QueueName, public readonly maxSize: number) {
    super(`Queue ${queue} overflow: max size ${maxSize} reached`);
    this.name = 'QueueOverflowError';
  }
}
