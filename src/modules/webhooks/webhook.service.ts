/**
 * Webhook Processing Service
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Webhook, WebhookDelivery, WebhookEvent, CreateWebhookInput } from './webhook.types.js';
import { CreateWebhookSchema } from './webhook.types.js';
import type { IAuditService } from '../audit/audit.service.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IWebhookService {
  create(input: CreateWebhookInput, actor: AuthenticatedUser): Promise<Result<Webhook>>;
  getById(id: string): Promise<Result<Webhook>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Webhook>>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  trigger(event: WebhookEvent): Promise<Result<readonly WebhookDelivery[]>>;
  getDeliveries(webhookId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<WebhookDelivery>>>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

export class WebhookService extends BaseService implements IWebhookService {
  private readonly collection = 'webhooks';
  private readonly deliveriesCollection = 'webhook_deliveries';

  constructor(
    private readonly firestore: IFirestoreClient, private readonly audit: IAuditService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async create(input: CreateWebhookInput, actor: AuthenticatedUser): Promise<Result<Webhook>> {
    const parsed = CreateWebhookSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const secret = parsed.data.secret ?? crypto.randomUUID().replace(/-/g, '');
    const now = new Date();
    const webhook: Record<string, unknown> = {
      url: parsed.data.url, events: parsed.data.events, organizationId: parsed.data.organizationId,
      userId: actor.uid, secret, active: parsed.data.active, failureCount: 0,
      lastTriggeredAt: null, lastResponseStatus: null, metadata: parsed.data.metadata ?? {},
      createdAt: now, updatedAt: now,
    };
    await this.firestore.createDocument(this.collection, id, webhook);
    await this.audit.log({ action: 'webhook.created', actorId: actor.uid, targetId: id, targetType: 'Webhook', data: { url: parsed.data.url } });
    return this.success({ id, ...webhook } as unknown as Webhook);
  }

  async getById(id: string): Promise<Result<Webhook>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.success({ id, ...doc.data } as Webhook) : this.failure(ErrorCode.NOT_FOUND, `Webhook ${id} not found`);
  }

  async listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Webhook>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'organizationId', operator: '==', value: orgId }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d) => ({ id: d.id, ...d.data } as Webhook));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }

  async delete(id: string, _actor: AuthenticatedUser): Promise<Result<void>> {
    await this.firestore.deleteDocument(this.collection, id);
    return this.success(undefined);
  }

  async trigger(event: WebhookEvent): Promise<Result<readonly WebhookDelivery[]>> {
    const webhooks = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'organizationId', operator: '==', value: event.organizationId }, { field: 'active', operator: '==', value: true }]);

    const matchingWebhooks = webhooks.filter((w) => ((w.data['events'] as string[]) ?? []).includes(event.event));

    const deliveries: WebhookDelivery[] = [];
    for (const wh of matchingWebhooks) {
      const delivery = await this.deliver(wh.id, wh.data as unknown as Webhook, event);
      deliveries.push(delivery);
    }

    return this.success(deliveries);
  }

  async getDeliveries(webhookId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<WebhookDelivery>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.deliveriesCollection,
      [{ field: 'webhookId', operator: '==', value: webhookId }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d) => ({ id: d.id, ...d.data } as WebhookDelivery));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const expectedSignature = `sha256=${expected}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  }

  private async deliver(id: string, webhook: Webhook, event: WebhookEvent): Promise<WebhookDelivery> {
    const deliveryId = crypto.randomUUID();
    const now = new Date();
    const payload = { event: event.event, data: event.data, timestamp: event.timestamp.toISOString() };
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    let status: WebhookDelivery['status'] = 'pending';
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;
    let durationMs = 0;

    try {
      const start = performance.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': `sha256=${signature}`, 'X-Webhook-Event': event.event },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      durationMs = performance.now() - start;
      responseStatus = response.status;
      responseBody = await response.text().catch(() => null);
      status = response.ok ? 'delivered' : 'failed';
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
    }

    const delivery: Record<string, unknown> = {
      webhookId: id, event: event.event, payload, responseStatus, responseBody,
      durationMs, attempt: 1, status, error, createdAt: now, updatedAt: now,
    };
    await this.firestore.createDocument(this.deliveriesCollection, deliveryId, delivery);
    await this.firestore.updateDocument(this.collection, id, {
      lastTriggeredAt: now, lastResponseStatus: responseStatus,
      failureCount: status === 'failed' ? (webhook.failureCount ?? 0) + 1 : 0, updatedAt: now,
    });

    return { id: deliveryId, ...delivery } as unknown as WebhookDelivery;
  }
}
