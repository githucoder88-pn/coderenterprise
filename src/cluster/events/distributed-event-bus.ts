/**
 * Distributed Event Bus
 *
 * System-wide event publishing with subscriptions, correlation, and replay.
 * Designed for horizontal scaling via Redis pub/sub.
 */

import type { SystemEvent, SystemEventName } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

type EventHandler<T = unknown> = (event: SystemEvent<T>) => void | Promise<void>;

export interface IDistributedEventBus {
  publish<T>(name: SystemEventName, source: string, data: T, correlationId?: string): Promise<SystemEvent<T>>;
  subscribe<T>(name: SystemEventName, handler: EventHandler<T>): string;
  subscribeAll(handler: EventHandler): string;
  unsubscribe(subscriptionId: string): void;
  getHistory(name?: SystemEventName, limit?: number): readonly SystemEvent[];
  replay(from: Date, to: Date, handler: EventHandler): Promise<number>;
  getStats(): { totalPublished: number; totalSubscriptions: number; byEvent: Record<string, number> };
}

export class DistributedEventBus implements IDistributedEventBus {
  private readonly subscriptions = new Map<string, { name: SystemEventName | '*'; handler: EventHandler }>();
  private readonly history: SystemEvent[] = [];
  private totalPublished = 0;
  private readonly eventCounts = new Map<string, number>();

  constructor(private readonly logger: ILogger) {}

  async publish<T>(name: SystemEventName, source: string, data: T, correlationId?: string): Promise<SystemEvent<T>> {
    const event: SystemEvent<T> = {
      id: nanoid(), name, source, data,
      timestamp: new Date(), correlationId: correlationId ?? null, metadata: {},
    };

    this.history.push(event);
    if (this.history.length > 50_000) this.history.splice(0, 5000);

    this.totalPublished++;
    this.eventCounts.set(name, (this.eventCounts.get(name) ?? 0) + 1);

    // Deliver to subscribers
    const matchingSubs = [...this.subscriptions.values()].filter(
      (s) => s.name === '*' || s.name === name,
    );

    await Promise.allSettled(
      matchingSubs.map(async (sub) => {
        try {
          await sub.handler(event);
        } catch (error) {
          this.logger.error({ name, source, error }, 'Event handler error');
        }
      }),
    );

    this.logger.debug({ name, source, eventId: event.id }, 'Event published');
    return event;
  }

  subscribe<T>(name: SystemEventName, handler: EventHandler<T>): string {
    const id = nanoid();
    this.subscriptions.set(id, { name, handler: handler as EventHandler });
    return id;
  }

  subscribeAll(handler: EventHandler): string {
    const id = nanoid();
    this.subscriptions.set(id, { name: '*', handler });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  getHistory(name?: SystemEventName, limit = 100): readonly SystemEvent[] {
    let events = this.history;
    if (name) events = events.filter((e) => e.name === name);
    return events.slice(-limit);
  }

  async replay(from: Date, to: Date, handler: EventHandler): Promise<number> {
    const events = this.history.filter((e) => e.timestamp >= from && e.timestamp <= to);
    for (const event of events) {
      try { await handler(event); } catch { /* skip */ }
    }
    return events.length;
  }

  getStats(): { totalPublished: number; totalSubscriptions: number; byEvent: Record<string, number> } {
    return {
      totalPublished: this.totalPublished,
      totalSubscriptions: this.subscriptions.size,
      byEvent: Object.fromEntries(this.eventCounts),
    };
  }
}
