/**
 * Extension Message Bus
 *
 * Inter-extension and extension↔core communication.
 * Supports pub/sub, request/reply, and broadcast patterns.
 */

import type { ExtensionMessage, MessageSubscription } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

export interface IMessageBus {
  publish(from: string, channel: string, payload: unknown): Promise<void>;
  subscribe(extensionId: string, channel: string, handler: (message: ExtensionMessage) => void | Promise<void>): string;
  unsubscribe(subscriptionId: string): void;
  request(from: string, to: string, channel: string, payload: unknown, timeoutMs?: number): Promise<unknown>;
  broadcast(from: string, channel: string, payload: unknown): Promise<void>;
  getSubscriptions(extensionId: string): readonly MessageSubscription[];
  getMessageHistory(channel: string, limit?: number): readonly ExtensionMessage[];
}

export class MessageBus implements IMessageBus {
  private readonly subscriptions = new Map<string, { subscription: MessageSubscription; handler: (message: ExtensionMessage) => void | Promise<void> }>();
  private readonly messageHistory: ExtensionMessage[] = [];
  private readonly pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor(private readonly logger: ILogger) {}

  async publish(from: string, channel: string, payload: unknown): Promise<void> {
    const message: ExtensionMessage = {
      id: nanoid(), from, to: '*', channel, payload,
      timestamp: new Date(), replyTo: null,
    };

    this.recordMessage(message);

    const matchingSubs = [...this.subscriptions.values()].filter(
      (s) => s.subscription.channel === channel && s.subscription.active,
    );

    await Promise.allSettled(matchingSubs.map((s) => {
      try { return s.handler(message); } catch (e) { this.logger.warn({ channel, error: e }, 'Handler error'); return Promise.resolve(); }
    }));
  }

  subscribe(extensionId: string, channel: string, handler: (message: ExtensionMessage) => void | Promise<void>): string {
    const id = nanoid();
    const subscription: MessageSubscription = { id, extensionId, channel, handler: 'handler', active: true };
    this.subscriptions.set(id, { subscription, handler });
    this.logger.debug({ extensionId, channel, subscriptionId: id }, 'Subscribed');
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  async request(from: string, to: string, channel: string, payload: unknown, timeoutMs = 10_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = nanoid();
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${channel}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      const message: ExtensionMessage = {
        id: nanoid(), from, to, channel, payload,
        timestamp: new Date(), replyTo: requestId,
      };

      this.recordMessage(message);

      const targetSubs = [...this.subscriptions.values()].filter(
        (s) => s.subscription.extensionId === to && s.subscription.channel === channel && s.subscription.active,
      );

      for (const sub of targetSubs) {
        try {
          const result = sub.handler(message);
          if (result instanceof Promise) {
            result.then((r) => {
              if (this.pendingRequests.has(requestId)) {
                clearTimeout(timer);
                this.pendingRequests.delete(requestId);
                resolve(r);
              }
            }).catch(reject);
          } else {
            clearTimeout(timer);
            this.pendingRequests.delete(requestId);
            resolve(result);
          }
        } catch (error) {
          clearTimeout(timer);
          this.pendingRequests.delete(requestId);
          reject(error);
        }
      }
    });
  }

  async broadcast(from: string, channel: string, payload: unknown): Promise<void> {
    return this.publish(from, channel, payload);
  }

  getSubscriptions(extensionId: string): readonly MessageSubscription[] {
    return [...this.subscriptions.values()]
      .filter((s) => s.subscription.extensionId === extensionId)
      .map((s) => s.subscription);
  }

  getMessageHistory(channel: string, limit = 50): readonly ExtensionMessage[] {
    return this.messageHistory.filter((m) => m.channel === channel).slice(-limit);
  }

  private recordMessage(message: ExtensionMessage): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > 10_000) this.messageHistory.splice(0, 1000);
  }
}
