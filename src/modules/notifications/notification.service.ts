/**
 * Notification Service
 */

import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Notification, SendNotificationInput, NotificationPreferences } from './notification.types.js';
import { SendNotificationSchema } from './notification.types.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface INotificationService {
  send(input: SendNotificationInput): Promise<Result<Notification>>;
  getById(id: string): Promise<Result<Notification>>;
  listByUser(userId: string, pagination: PaginationParams, unreadOnly?: boolean): Promise<Result<PaginatedResponse<Notification>>>;
  markRead(id: string): Promise<Result<void>>;
  markAllRead(userId: string): Promise<Result<number>>;
  getUnreadCount(userId: string): Promise<Result<number>>;
  getPreferences(userId: string): Promise<Result<NotificationPreferences>>;
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<Result<NotificationPreferences>>;
}

export class NotificationService extends BaseService implements INotificationService {
  private readonly collection = 'notifications';
  private readonly prefsCollection = 'notification_preferences';

  constructor(
    private readonly firestore: IFirestoreClient, private readonly cache: ICacheService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async send(input: SendNotificationInput): Promise<Result<Notification>> {
    const parsed = SendNotificationSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = { ...parsed.data, read: false, readAt: null, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data);
    // Invalidate unread count cache
    await this.cache.del(`notif:unread:${input.userId}`);
    return this.success({ id, ...parsed.data, read: false, readAt: null, createdAt: now, updatedAt: now } as Notification);
  }

  async getById(id: string): Promise<Result<Notification>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return this.failure(ErrorCode.NOT_FOUND, `Notification ${id} not found`);
    return this.success({ id, ...doc.data } as Notification);
  }

  async listByUser(userId: string, pagination: PaginationParams, unreadOnly = false): Promise<Result<PaginatedResponse<Notification>>> {
    const filters: { field: string; operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any'; value: unknown }[] = [{ field: 'userId', operator: '==' as const, value: userId }];
    if (unreadOnly) filters.push({ field: 'read', operator: '==' as const, value: false });
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, filters,
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const all = docs.map((d) => ({ id: d.id, ...d.data } as Notification));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination));
  }

  async markRead(id: string): Promise<Result<void>> {
    await this.firestore.updateDocument(this.collection, id, { read: true, readAt: new Date(), updatedAt: new Date() });
    return this.success(undefined);
  }

  async markAllRead(userId: string): Promise<Result<number>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'userId', operator: '==', value: userId }, { field: 'read', operator: '==', value: false }]);
    const batch = this.firestore.batch();
    for (const doc of docs) {
      batch.update(this.firestore.docRef(this.collection, doc.id), { read: true, readAt: new Date() });
    }
    await batch.commit();
    await this.cache.del(`notif:unread:${userId}`);
    return this.success(docs.length);
  }

  async getUnreadCount(userId: string): Promise<Result<number>> {
    const cached = await this.cache.get<number>(`notif:unread:${userId}`);
    if (cached !== null) return this.success(cached);
    const docs = await this.firestore.getCollection(this.collection,
      [{ field: 'userId', operator: '==', value: userId }, { field: 'read', operator: '==', value: false }]);
    const count = docs.length;
    await this.cache.set(`notif:unread:${userId}`, count, 60);
    return this.success(count);
  }

  async getPreferences(userId: string): Promise<Result<NotificationPreferences>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.prefsCollection, userId);
    if (doc) return this.success({ userId, ...doc.data } as NotificationPreferences);
    // Default preferences
    const defaults: NotificationPreferences = { userId, email: true, inApp: true, push: true, webhook: false, types: {}, createdAt: new Date(), updatedAt: new Date() };
    await this.firestore.createDocument(this.prefsCollection, userId, defaults as unknown as Record<string, unknown>);
    return this.success(defaults);
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<Result<NotificationPreferences>> {
    await this.firestore.updateDocument(this.prefsCollection, userId, { ...prefs, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.getPreferences(userId);
    return updated;
  }
}
