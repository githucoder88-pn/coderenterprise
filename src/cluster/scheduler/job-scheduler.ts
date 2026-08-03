/**
 * Job Scheduler
 *
 * Schedules recurring and one-time jobs.
 * Integrates with QueueManager for job dispatch.
 */

import type { QueueName } from '../types.js';
import type { QueueManager } from '../queues/queue-manager.js';
import type { ILogger } from '../../telemetry/logger.js';

interface ScheduledJob {
  readonly id: string;
  readonly name: string;
  readonly queue: QueueName;
  readonly data: unknown;
  readonly cron: string | null;
  readonly intervalMs: number | null;
  readonly nextRunAt: Date;
  readonly lastRunAt: Date | null;
  readonly enabled: boolean;
  readonly metadata: Record<string, unknown>;
}

export interface IJobScheduler {
  schedule(options: { name: string; queue: QueueName; data: unknown; cron?: string; intervalMs?: number }): string;
  unschedule(id: string): void;
  enable(id: string): void;
  disable(id: string): void;
  list(): readonly ScheduledJob[];
  tick(): Promise<number>;
  getNextRunTime(cron: string): Date;
}

export class JobScheduler implements IJobScheduler {
  private readonly scheduled = new Map<string, ScheduledJob>();

  constructor(
    private readonly queueManager: QueueManager,
    private readonly logger: ILogger,
  ) {}

  schedule(options: { name: string; queue: QueueName; data: unknown; cron?: string; intervalMs?: number }): string {
    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    const job: ScheduledJob = {
      id, name: options.name, queue: options.queue, data: options.data,
      cron: options.cron ?? null, intervalMs: options.intervalMs ?? null,
      nextRunAt: options.intervalMs
        ? new Date(now.getTime() + options.intervalMs)
        : options.cron ? this.getNextRunTime(options.cron) : now,
      lastRunAt: null, enabled: true, metadata: {},
    };

    this.scheduled.set(id, job);
    this.logger.info({ id, name: options.name, queue: options.queue }, 'Job scheduled');
    return id;
  }

  unschedule(id: string): void { this.scheduled.delete(id); }
  enable(id: string): void { const job = this.scheduled.get(id); if (job) this.scheduled.set(id, { ...job, enabled: true }); }
  disable(id: string): void { const job = this.scheduled.get(id); if (job) this.scheduled.set(id, { ...job, enabled: false }); }
  list(): readonly ScheduledJob[] { return [...this.scheduled.values()]; }

  async tick(): Promise<number> {
    const now = Date.now();
    let dispatched = 0;

    for (const [id, job] of this.scheduled) {
      if (!job.enabled) continue;
      if (job.nextRunAt.getTime() > now) continue;

      try {
        await this.queueManager.enqueue(job.queue, job.name, job.data);
        dispatched++;

        const nextRunAt = job.intervalMs
          ? new Date(now + job.intervalMs)
          : job.cron ? this.getNextRunTime(job.cron) : new Date(now + 60_000);

        this.scheduled.set(id, { ...job, lastRunAt: new Date(), nextRunAt });
        this.logger.debug({ id, name: job.name, queue: job.queue }, 'Scheduled job dispatched');
      } catch (error) {
        this.logger.error({ id, error }, 'Failed to dispatch scheduled job');
      }
    }

    return dispatched;
  }

  getNextRunTime(cron: string): Date {
    // Simple cron parser: "*/5 * * * *" = every 5 minutes
    const parts = cron.split(' ');
    const minute = parts[0];
    const now = new Date();
    const next = new Date(now);

    if (minute?.startsWith('*/')) {
      const interval = parseInt(minute.slice(2), 10);
      next.setMinutes(Math.ceil(now.getMinutes() / interval) * interval, 0, 0);
      if (next <= now) next.setMinutes(next.getMinutes() + interval);
    } else if (minute && !isNaN(parseInt(minute, 10))) {
      next.setMinutes(parseInt(minute, 10), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
    } else {
      next.setMinutes(now.getMinutes() + 1, 0, 0);
    }

    return next;
  }
}
