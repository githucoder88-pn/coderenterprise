/**
 * Distributed Event Bus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DistributedEventBus } from '../../../cluster/events/distributed-event-bus.js';
import { createMockLogger } from '../../helpers.js';

describe('DistributedEventBus', () => {
  let bus: DistributedEventBus;

  beforeEach(() => { bus = new DistributedEventBus(createMockLogger()); });

  describe('publish / subscribe', () => {
    it('should deliver events to subscribers', async () => {
      const handler = vi.fn();
      bus.subscribe('task.created', handler);
      await bus.publish('task.created', 'test', { taskId: '1' });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].name).toBe('task.created');
    });

    it('should deliver to wildcard subscribers', async () => {
      const handler = vi.fn();
      bus.subscribeAll(handler);
      await bus.publish('task.created', 'test', {});
      await bus.publish('agent.created', 'test', {});
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should not deliver to wrong event subscribers', async () => {
      const handler = vi.fn();
      bus.subscribe('task.created', handler);
      await bus.publish('agent.created', 'test', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving events', async () => {
      const handler = vi.fn();
      const subId = bus.subscribe('task.created', handler);
      bus.unsubscribe(subId);
      await bus.publish('task.created', 'test', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('history', () => {
    it('should record event history', async () => {
      await bus.publish('task.created', 'test', {});
      await bus.publish('task.completed', 'test', {});
      await bus.publish('agent.created', 'test', {});
      expect(bus.getHistory().length).toBe(3);
      expect(bus.getHistory('task.created').length).toBe(1);
    });
  });

  describe('replay', () => {
    it('should replay events in time range', async () => {
      await bus.publish('task.created', 'test', { id: 1 });
      const handler = vi.fn();
      const count = await bus.replay(new Date(Date.now() - 60000), new Date(), handler);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('stats', () => {
    it('should track publishing stats', async () => {
      await bus.publish('task.created', 'test', {});
      await bus.publish('task.created', 'test', {});
      await bus.publish('agent.created', 'test', {});
      const stats = bus.getStats();
      expect(stats.totalPublished).toBe(3);
      expect(stats.byEvent['task.created']).toBe(2);
      expect(stats.byEvent['agent.created']).toBe(1);
    });
  });
});
