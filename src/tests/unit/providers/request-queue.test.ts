/**
 * Request Queue Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequestQueue, QueueOverflowError } from '../../../modules/providers/resilience/request-queue.js';
import type { QueueConfig } from '../../../modules/providers/types.js';

const defaultConfig: QueueConfig = {
  maxSize: 5,
  concurrency: 2,
  timeoutMs: 5000,
};

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue('openai', defaultConfig);
  });

  describe('basic enqueue', () => {
    it('should execute and return result', async () => {
      const result = await queue.enqueue(async () => 42);
      expect(result).toBe(42);
    });

    it('should handle multiple enqueued requests', async () => {
      const results = await Promise.all([
        queue.enqueue(async () => 1),
        queue.enqueue(async () => 2),
        queue.enqueue(async () => 3),
      ]);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('concurrency', () => {
    it('should respect concurrency limits', async () => {
      let running = 0;
      let maxRunning = 0;

      const task = async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
        return true;
      };

      await Promise.all([
        queue.enqueue(task),
        queue.enqueue(task),
        queue.enqueue(task),
        queue.enqueue(task),
      ]);

      expect(maxRunning).toBeLessThanOrEqual(2);
    });
  });

  describe('priority', () => {
    it('should process higher priority first', async () => {
      const order: number[] = [];

      // Fill concurrency slots
      const blocker1 = queue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return 'blocker';
      });
      const blocker2 = queue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return 'blocker';
      });

      // These should queue
      const lowPri = queue.enqueue(async () => {
        order.push(1);
        return 1;
      }, 1);
      const highPri = queue.enqueue(async () => {
        order.push(2);
        return 2;
      }, 10);

      await Promise.all([blocker1, blocker2, lowPri, highPri]);

      // Higher priority should be processed before lower
      expect(order[0]).toBe(2);
      expect(order[1]).toBe(1);
    });
  });

  describe('overflow', () => {
    it('should reject when queue is full', async () => {
      const config: QueueConfig = { maxSize: 2, concurrency: 1, timeoutMs: 5000 };
      const smallQueue = new RequestQueue('openai', config);

      // Fill the running slot
      const blocker = smallQueue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 'done';
      });

      // Fill the queue
      smallQueue.enqueue(async () => 'a');
      smallQueue.enqueue(async () => 'b');

      // This should overflow
      await expect(smallQueue.enqueue(async () => 'c')).rejects.toThrow(QueueOverflowError);

      await blocker;
    });
  });

  describe('stats', () => {
    it('should track queue stats', async () => {
      await queue.enqueue(async () => 42);
      const stats = queue.getStats();

      expect(stats.provider).toBe('openai');
      expect(stats.totalProcessed).toBe(1);
      expect(stats.running).toBe(0);
    });
  });
});
