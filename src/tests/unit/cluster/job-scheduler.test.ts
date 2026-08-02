/**
 * Job Scheduler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JobScheduler } from '../../../cluster/scheduler/job-scheduler.js';
import { QueueManager } from '../../../cluster/queues/queue-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('JobScheduler', () => {
  let scheduler: JobScheduler;
  let qm: QueueManager;

  beforeEach(() => {
    qm = new QueueManager(createMockLogger());
    scheduler = new JobScheduler(qm, createMockLogger());
  });

  describe('schedule', () => {
    it('should schedule a recurring job', () => {
      const id = scheduler.schedule({ name: 'cleanup', queue: 'telemetry', data: {}, intervalMs: 60000 });
      expect(id).toBeDefined();
      expect(scheduler.list().length).toBe(1);
    });

    it('should schedule a cron job', () => {
      const id = scheduler.schedule({ name: 'daily-report', queue: 'billing', data: {}, cron: '0 9 * * *' });
      expect(id).toBeDefined();
    });
  });

  describe('tick', () => {
    it('should dispatch due jobs', async () => {
      scheduler.schedule({ name: 'test', queue: 'chat', data: { msg: 'hi' }, intervalMs: 0 });
      const dispatched = await scheduler.tick();
      expect(dispatched).toBe(1);
    });

    it('should not dispatch disabled jobs', async () => {
      const id = scheduler.schedule({ name: 'test', queue: 'chat', data: {}, intervalMs: 0 });
      scheduler.disable(id);
      const dispatched = await scheduler.tick();
      expect(dispatched).toBe(0);
    });

    it('should not dispatch future jobs', async () => {
      scheduler.schedule({ name: 'test', queue: 'chat', data: {}, intervalMs: 60000 });
      const dispatched = await scheduler.tick();
      expect(dispatched).toBe(0);
    });
  });

  describe('enable / disable', () => {
    it('should toggle job state', () => {
      const id = scheduler.schedule({ name: 'test', queue: 'chat', data: {}, intervalMs: 60000 });
      scheduler.disable(id);
      expect(scheduler.list()[0]!.enabled).toBe(false);
      scheduler.enable(id);
      expect(scheduler.list()[0]!.enabled).toBe(true);
    });
  });

  describe('unschedule', () => {
    it('should remove a scheduled job', () => {
      const id = scheduler.schedule({ name: 'test', queue: 'chat', data: {}, intervalMs: 60000 });
      scheduler.unschedule(id);
      expect(scheduler.list().length).toBe(0);
    });
  });
});
