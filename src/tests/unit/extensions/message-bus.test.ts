/**
 * Message Bus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageBus } from '../../../extensions/messaging/message-bus.js';
import { createMockLogger } from '../../helpers.js';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => { bus = new MessageBus(createMockLogger()); });

  describe('publish / subscribe', () => {
    it('should deliver messages to subscribers', async () => {
      const handler = vi.fn();
      bus.subscribe('ext-1', 'test-channel', handler);
      await bus.publish('ext-2', 'test-channel', { data: 'hello' });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0]![0].payload).toEqual({ data: 'hello' });
    });

    it('should not deliver to wrong channel', async () => {
      const handler = vi.fn();
      bus.subscribe('ext-1', 'channel-a', handler);
      await bus.publish('ext-2', 'channel-b', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('should deliver to multiple subscribers', async () => {
      const h1 = vi.fn(), h2 = vi.fn();
      bus.subscribe('ext-1', 'ch', h1);
      bus.subscribe('ext-2', 'ch', h2);
      await bus.publish('ext-3', 'ch', {});
      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving messages', async () => {
      const handler = vi.fn();
      const subId = bus.subscribe('ext-1', 'ch', handler);
      bus.unsubscribe(subId);
      await bus.publish('ext-2', 'ch', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all subscribers', async () => {
      const handler = vi.fn();
      bus.subscribe('ext-1', 'broadcast-ch', handler);
      await bus.broadcast('core', 'broadcast-ch', { event: 'update' });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions for an extension', () => {
      bus.subscribe('ext-1', 'ch1', () => {});
      bus.subscribe('ext-1', 'ch2', () => {});
      bus.subscribe('ext-2', 'ch3', () => {});
      expect(bus.getSubscriptions('ext-1').length).toBe(2);
      expect(bus.getSubscriptions('ext-2').length).toBe(1);
    });
  });

  describe('messageHistory', () => {
    it('should record message history', async () => {
      await bus.publish('a', 'ch', { x: 1 });
      await bus.publish('b', 'ch', { x: 2 });
      await bus.publish('c', 'other', { x: 3 });
      expect(bus.getMessageHistory('ch').length).toBe(2);
    });
  });
});
