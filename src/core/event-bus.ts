/**
 * In-Process Event Bus
 *
 * Type-safe pub/sub for domain events.
 * For cross-process events, use BullMQ queues.
 */

import type { DomainEvent, DomainEventPayload } from '../types/index.js';

export type EventHandler<T extends DomainEventPayload = DomainEventPayload> = (
  event: T,
) => void | Promise<void>;

interface EventRegistration {
  readonly handler: EventHandler;
  readonly once: boolean;
}

export interface IEventBus {
  emit(event: DomainEventPayload): Promise<void>;
  on<T extends DomainEventPayload = DomainEventPayload>(
    event: DomainEvent,
    handler: EventHandler<T>,
  ): () => void;
  once<T extends DomainEventPayload = DomainEventPayload>(
    event: DomainEvent,
    handler: EventHandler<T>,
  ): () => void;
  off(event: DomainEvent, handler: EventHandler): void;
  removeAllListeners(event?: DomainEvent): void;
}

export class EventBus implements IEventBus {
  private readonly listeners = new Map<DomainEvent, Set<EventRegistration>>();

  async emit(event: DomainEventPayload): Promise<void> {
    const handlers = this.listeners.get(event.event);
    if (!handlers) return;

    const removals: EventRegistration[] = [];

    const promises = [...handlers].map(async (reg) => {
      try {
        await reg.handler(event);
        if (reg.once) removals.push(reg);
      } catch (error) {
        console.error(`Event handler error for ${event.event}:`, error);
      }
    });

    await Promise.allSettled(promises);

    for (const reg of removals) {
      handlers.delete(reg);
    }
  }

  on<T extends DomainEventPayload = DomainEventPayload>(
    event: DomainEvent,
    handler: EventHandler<T>,
  ): () => void {
    return this.addListener(event, handler as EventHandler<DomainEventPayload>, false);
  }

  once<T extends DomainEventPayload = DomainEventPayload>(
    event: DomainEvent,
    handler: EventHandler<T>,
  ): () => void {
    return this.addListener(event, handler as EventHandler<DomainEventPayload>, true);
  }

  off(event: DomainEvent, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const reg of handlers) {
      if (reg.handler === handler) {
        handlers.delete(reg);
        break;
      }
    }
  }

  removeAllListeners(event?: DomainEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private addListener(
    event: DomainEvent,
    handler: EventHandler,
    once: boolean,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const reg: EventRegistration = { handler, once };
    this.listeners.get(event)!.add(reg);

    return () => this.off(event, handler);
  }
}
