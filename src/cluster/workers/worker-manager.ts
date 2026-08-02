/**
 * Worker Manager
 *
 * Manages a pool of workers for processing jobs from queues.
 * Handles worker lifecycle, heartbeats, and graceful shutdown.
 */

import type { WorkerInfo, WorkerStatus, QueueName } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface WorkerConfig {
  readonly concurrency: number;
  readonly heartbeatIntervalMs: number;
  readonly stalledTimeoutMs: number;
  readonly gracefulShutdownMs: number;
}

const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  concurrency: 5,
  heartbeatIntervalMs: 10_000,
  stalledTimeoutMs: 30_000,
  gracefulShutdownMs: 10_000,
};

export interface IWorkerManager {
  spawn(queues: readonly QueueName[], config?: Partial<WorkerConfig>): WorkerInfo;
  stop(workerId: string): Promise<void>;
  stopAll(): Promise<void>;
  getWorker(id: string): WorkerInfo | null;
  getWorkers(): readonly WorkerInfo[];
  getActiveWorkers(): readonly WorkerInfo[];
  getWorkerStats(): { total: number; idle: number; busy: number; stopped: number };
  heartbeat(workerId: string): void;
  removeStalled(): number;
}

export class WorkerManager implements IWorkerManager {
  private readonly workers = new Map<string, WorkerInfo & { heartbeatTimer?: ReturnType<typeof setInterval> }>();
  private workerCounter = 0;

  constructor(
    private readonly hostname: string,
    private readonly logger: ILogger,
  ) {}

  spawn(queues: readonly QueueName[], config?: Partial<WorkerConfig>): WorkerInfo {
    const cfg = { ...DEFAULT_WORKER_CONFIG, ...config };
    const id = `worker-${this.hostname}-${++this.workerCounter}`;
    const now = new Date();

    const worker: WorkerInfo = {
      id, hostname: this.hostname, pid: process.pid,
      status: 'idle', queues: [...queues], concurrency: cfg.concurrency,
      activeJobs: 0, completedJobs: 0, failedJobs: 0, uptime: 0,
      lastHeartbeat: now, metadata: {}, createdAt: now, updatedAt: now,
    };

    // Start heartbeat
    const heartbeatTimer = setInterval(() => {
      this.heartbeat(id);
    }, cfg.heartbeatIntervalMs);

    this.workers.set(id, { ...worker, heartbeatTimer });
    this.logger.info({ workerId: id, queues, concurrency: cfg.concurrency }, 'Worker spawned');

    return worker;
  }

  async stop(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    if (worker.heartbeatTimer) clearInterval(worker.heartbeatTimer);

    const updated = { ...worker, status: 'stopped' as WorkerStatus, updatedAt: new Date() };
    this.workers.set(workerId, updated);
    this.logger.info({ workerId }, 'Worker stopped');
  }

  async stopAll(): Promise<void> {
    const promises = [...this.workers.keys()].map((id) => this.stop(id));
    await Promise.allSettled(promises);
    this.logger.info({ count: this.workers.size }, 'All workers stopped');
  }

  getWorker(id: string): WorkerInfo | null {
    const w = this.workers.get(id);
    if (!w) return null;
    const { heartbeatTimer: _, ...info } = w;
    return info;
  }

  getWorkers(): readonly WorkerInfo[] {
    return [...this.workers.values()].map(({ heartbeatTimer: _, ...w }) => w);
  }

  getActiveWorkers(): readonly WorkerInfo[] {
    return this.getWorkers().filter((w) => w.status === 'busy' || w.status === 'idle');
  }

  getWorkerStats(): { total: number; idle: number; busy: number; stopped: number } {
    const workers = this.getWorkers();
    return {
      total: workers.length,
      idle: workers.filter((w) => w.status === 'idle').length,
      busy: workers.filter((w) => w.status === 'busy').length,
      stopped: workers.filter((w) => w.status === 'stopped').length,
    };
  }

  heartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.set(workerId, { ...worker, lastHeartbeat: new Date(), updatedAt: new Date() });
    }
  }

  removeStalled(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, worker] of this.workers) {
      if (worker.status !== 'stopped' && now - worker.lastHeartbeat.getTime() > 60_000) {
        this.stop(id);
        removed++;
        this.logger.warn({ workerId: id }, 'Stalled worker removed');
      }
    }
    return removed;
  }
}
