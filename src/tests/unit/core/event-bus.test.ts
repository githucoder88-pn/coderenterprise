/**
 * EventBus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../core/event-bus.js';
import { DomainEvent, type DomainEventPayload } from '../../../types/index.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  const createEvent = (event: DomainEvent = DomainEvent.USER_CREATED): DomainEventPayload => ({
    eventId: 'evt-1',
    event,
    occurredAt: new Date(),
    aggregateId: 'user-1',
    aggregateType: 'User',
    data: { email: 'test@example.com' },
  });

  describe('on / emit', () => {
    it('should call handler when event is emitted', async () => {
      const handler = vi.fn();
      eventBus.on(DomainEvent.USER_CREATED, handler);

      await eventBus.emit(createEvent());

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        event: DomainEvent.USER_CREATED,
        aggregateId: 'user-1',
      }));
    });

    it('should call multiple handlers for same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(DomainEvent.USER_CREATED, handler1);
      eventBus.on(DomainEvent.USER_CREATED, handler2);

      await eventBus.emit(createEvent());

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should not call handler for different events', async () => {
      const handler = vi.fn();
      eventBus.on(DomainEvent.USER_DELETED, handler);

      await eventBus.emit(createEvent(DomainEvent.USER_CREATED));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle async handlers', async () => {
      const results: number[] = [];
      const handler = async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(1);
      };

      eventBus.on(DomainEvent.USER_CREATED, handler);
      await eventBus.emit(createEvent());

      expect(results).toEqual([1]);
    });
  });

  describe('once', () => {
    it('should call handler only once', async () => {
      const handler = vi.fn();
      eventBus.once(DomainEvent.USER_CREATED, handler);

      await eventBus.emit(createEvent());
      await eventBus.emit(createEvent());

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('off', () => {
    it('should remove handler', async () => {
      const handler = vi.fn();
      eventBus.on(DomainEvent.USER_CREATED, handler);
      eventBus.off(DomainEvent.USER_CREATED, handler);

      await eventBus.emit(createEvent());

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(DomainEvent.USER_CREATED, handler1);
      eventBus.on(DomainEvent.USER_DELETED, handler2);

      eventBus.removeAllListeners(DomainEvent.USER_CREATED);
      await eventBus.emit(createEvent(DomainEvent.USER_CREATED));
      await eventBus.emit(createEvent(DomainEvent.USER_DELETED));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should remove all listeners when no event specified', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(DomainEvent.USER_CREATED, handler1);
      eventBus.on(DomainEvent.USER_DELETED, handler2);

      eventBus.removeAllListeners();
      await eventBus.emit(createEvent(DomainEvent.USER_CREATED));
      await eventBus.emit(createEvent(DomainEvent.USER_DELETED));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should return unsubscribe function', async () => {
      const handler = vi.fn();
      const unsub = eventBus.on(DomainEvent.USER_CREATED, handler);

      unsub();
      await eventBus.emit(createEvent());

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not throw when handler throws', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('handler error'));
      const okHandler = vi.fn();

      eventBus.on(DomainEvent.USER_CREATED, errorHandler);
      eventBus.on(DomainEvent.USER_CREATED, okHandler);

      await expect(eventBus.emit(createEvent())).resolves.toBeUndefined();
      expect(okHandler).toHaveBeenCalledOnce();
    });
  });
});
