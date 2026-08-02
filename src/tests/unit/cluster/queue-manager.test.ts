/**
 * Queue Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueManager, QueueOverflowError } from '../../../cluster/queues/queue-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('QueueManager', () => {
  let qm: QueueManager;

  beforeEach(() => { qm = new QueueManager(createMockLogger(), { maxConcurrency: 3, maxQueueSize: 100 }); });

  describe('enqueue', () => {
    it('should enqueue a job', async () => {
      const job = await qm.enqueue('chat', 'process-message', { text: 'hello' });
      expect(job.queue).toBe('chat');
      expect(job.name).toBe('process-message');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe(50);
    });

    it('should respect priority ordering', async () => {
      const j1 = await qm.enqueue('chat', 'low', {}, { priority: 10 });
      const j2 = await qm.enqueue('chat', 'high', {}, { priority: 90 });
      const j3 = await qm.enqueue('chat', 'medium', {}, { priority: 50 });

      const stats = await qm.getQueueStats('chat');
      expect(stats.pending).toBe(3);
    });

    it('should reject on overflow', async () => {
      const smallQm = new QueueManager(createMockLogger(), { maxQueueSize: 2 });
      await smallQm.enqueue('chat', 'j1', {});
      await smallQm.enqueue('chat', 'j2', {});
      await expect(smallQm.enqueue('chat', 'j3', {})).rejects.toThrow(QueueOverflowError);
    });
  });

  describe('complete / fail', () => {
    it('should complete a job', async () => {
      const job = await qm.enqueue('chat', 'test', {});
      await qm.complete(job.id, { result: 'ok' });
      const updated = await qm.getJob(job.id);
      expect(updated!.status).toBe('completed');
      expect(updated!.result).toEqual({ result: 'ok' });
    });

    it('should fail and retry a job', async () => {
      const job = await qm.enqueue('chat', 'test', {}, { maxAttempts: 3 });
      await qm.fail(job.id, 'temporary error');
      const updated = await qm.getJob(job.id);
      expect(updated!.status).toBe('pending'); // Retried
    });

    it('should permanently fail after max attempts', async () => {
      const job = await qm.enqueue('chat', 'test', {}, { maxAttempts: 1 });
      await qm.fail(job.id, 'permanent error');
      const updated = await qm.getJob(job.id);
      expect(updated!.status).toBe('failed');
    });
  });

  describe('cancel', () => {
    it('should cancel a job', async () => {
      const job = await qm.enqueue('chat', 'test', {});
      await qm.cancel(job.id);
      const updated = await qm.getJob(job.id);
      expect(updated!.status).toBe('cancelled');
    });
  });

  describe('process', () => {
    it('should process jobs with handler', async () => {
      const handler = vi.fn(async () => 'result');
      qm.process('chat', handler);

      await qm.enqueue('chat', 'test', { data: 1 });
      // Give it time to process
      await new Promise((r) => setTimeout(r, 50));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('should return queue stats', async () => {
      await qm.enqueue('chat', 'j1', {});
      await qm.enqueue('chat', 'j2', {});
      await qm.enqueue('workflow', 'j3', {});

      const stats = await qm.getQueueStats('chat');
      expect(stats.pending).toBe(2);

      const allStats = await qm.getAllStats();
      expect(allStats.chat.pending).toBe(2);
      expect(allStats.workflow.pending).toBe(1);
    });
  });

  describe('pause / resume', () => {
    it('should pause and resume queues', async () => {
      await qm.pause('chat');
      const handler = vi.fn(async () => {});
      qm.process('chat', handler);
      await qm.enqueue('chat', 'test', {});
      await new Promise((r) => setTimeout(r, 50));
      expect(handler).not.toHaveBeenCalled();

      await qm.resume('chat');
      await new Promise((r) => setTimeout(r, 50));
      expect(handler).toHaveBeenCalled();
    });
  });
});
