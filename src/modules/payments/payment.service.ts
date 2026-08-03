/**
 * Payment Integration Service
 *
 * Provider-agnostic payment abstraction (Stripe-ready).
 */

import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { PaymentIntent, PaymentMethod, Invoice, CreatePaymentIntentInput } from './payment.types.js';
import { CreatePaymentIntentSchema } from './payment.types.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IPaymentService {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<Result<PaymentIntent>>;
  getPaymentIntent(id: string): Promise<Result<PaymentIntent>>;
  listPaymentIntents(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<PaymentIntent>>>;
  addPaymentMethod(orgId: string, details: { type: string; last4: string; brand: string; expiryMonth: number; expiryYear: number }): Promise<Result<PaymentMethod>>;
  listPaymentMethods(orgId: string): Promise<Result<readonly PaymentMethod[]>>;
  removePaymentMethod(id: string): Promise<Result<void>>;
  generateInvoice(orgId: string, items: { description: string; quantity: number; unitPrice: number }[]): Promise<Result<Invoice>>;
  getInvoice(id: string): Promise<Result<Invoice>>;
  listInvoices(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Invoice>>>;
}

export class PaymentService extends BaseService implements IPaymentService {
  private readonly intentsCollection = 'payment_intents';
  private readonly methodsCollection = 'payment_methods';
  private readonly invoicesCollection = 'invoices';

  constructor(
    private readonly firestore: IFirestoreClient,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<Result<PaymentIntent>> {
    const parsed = CreatePaymentIntentSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const now = new Date();
    const intent: Record<string, unknown> = { ...parsed.data, status: 'pending', providerPaymentId: null, failureReason: null, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.intentsCollection, id, intent);
    return this.success({ id, ...intent } as unknown as PaymentIntent);
  }

  async getPaymentIntent(id: string): Promise<Result<PaymentIntent>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.intentsCollection, id);
    return doc ? this.success({ id, ...doc.data } as PaymentIntent) : this.failure(ErrorCode.NOT_FOUND, `Payment intent ${id} not found`);
  }

  async listPaymentIntents(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<PaymentIntent>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.intentsCollection,
      [{ field: 'organizationId', operator: '==', value: orgId }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d: { id: string; data: Record<string, unknown> }) => ({ id: d.id, ...d.data } as PaymentIntent));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }

  async addPaymentMethod(orgId: string, details: { type: string; last4: string; brand: string; expiryMonth: number; expiryYear: number }): Promise<Result<PaymentMethod>> {
    const id = crypto.randomUUID();
    const now = new Date();
    const method: Record<string, unknown> = { organizationId: orgId, ...details, isDefault: false, providerMethodId: `pm_${id}`, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.methodsCollection, id, method);
    return this.success({ id, ...method } as unknown as PaymentMethod);
  }

  async listPaymentMethods(orgId: string): Promise<Result<readonly PaymentMethod[]>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.methodsCollection,
      [{ field: 'organizationId', operator: '==', value: orgId }]);
    return this.success(docs.map((d: { id: string; data: Record<string, unknown> }) => ({ id: d.id, ...d.data } as PaymentMethod)));
  }

  async removePaymentMethod(id: string): Promise<Result<void>> {
    await this.firestore.deleteDocument(this.methodsCollection, id);
    return this.success(undefined);
  }

  async generateInvoice(orgId: string, items: { description: string; quantity: number; unitPrice: number }[]): Promise<Result<Invoice>> {
    const id = crypto.randomUUID();
    const now = new Date();
    const lineItems = items.map((item) => ({ ...item, total: item.quantity * item.unitPrice }));
    const amount = lineItems.reduce((sum, item) => sum + item.total, 0);
    const invoice: Record<string, unknown> = {
      organizationId: orgId, amount, currency: 'USD', status: 'open',
      lineItems, dueDate: new Date(now.getTime() + 30 * 86400_000), paidAt: null, pdfUrl: null,
      createdAt: now, updatedAt: now,
    };
    await this.firestore.createDocument(this.invoicesCollection, id, invoice);
    return this.success({ id, ...invoice } as unknown as Invoice);
  }

  async getInvoice(id: string): Promise<Result<Invoice>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.invoicesCollection, id);
    return doc ? this.success({ id, ...doc.data } as Invoice) : this.failure(ErrorCode.NOT_FOUND, `Invoice ${id} not found`);
  }

  async listInvoices(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Invoice>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.invoicesCollection,
      [{ field: 'organizationId', operator: '==', value: orgId }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d: { id: string; data: Record<string, unknown> }) => ({ id: d.id, ...d.data } as Invoice));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }
}
