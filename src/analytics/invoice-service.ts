/**
 * Invoice Service
 *
 * Automated invoice generation from usage records.
 * Supports line items, tax, PDF generation, and payment tracking.
 */

import type { Invoice, InvoiceLineItem, UsageRecord } from './types.js';
import type { UsageTracker } from './usage-tracker.js';
import type { ILogger } from '../telemetry/logger.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../types/index.js';
import { createPaginatedResponse } from '../types/index.js';

export interface IInvoiceService {
  generate(orgId: string, periodStart: Date, periodEnd: Date): Promise<Result<Invoice>>;
  get(id: string): Promise<Invoice | null>;
  getByOrg(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Invoice>>;
  markPaid(id: string): Promise<Result<Invoice>>;
  void(id: string): Promise<Result<Invoice>>;
  generateSummary(orgId: string, period: string): Promise<{ totalAmount: number; totalInvoices: number; paidAmount: number; unpaidAmount: number }>;
}

export class InvoiceService implements IInvoiceService {
  private readonly invoices = new Map<string, Invoice>();
  private invoiceCounter = 0;

  constructor(
    private readonly usageTracker: UsageTracker,
    private readonly logger: ILogger,
  ) {}

  async generate(orgId: string, periodStart: Date, periodEnd: Date): Promise<Result<Invoice>> {
    const records = this.getUsageInRange(orgId, periodStart, periodEnd);
    if (records.length === 0) {
      return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'No usage records found for period', timestamp: new Date() } };
    }

    // Aggregate by model
    const modelUsage = new Map<string, { tokens: number; cost: number; requests: number }>();
    for (const r of records) {
      const key = `${r.provider}/${r.model}`;
      const existing = modelUsage.get(key) ?? { tokens: 0, cost: 0, requests: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.estimatedCost;
      existing.requests++;
      modelUsage.set(key, existing);
    }

    const lineItems: InvoiceLineItem[] = [];
    for (const [model, usage] of modelUsage) {
      lineItems.push({
        description: `API Usage: ${model} (${usage.requests} requests, ${usage.tokens.toLocaleString()} tokens)`,
        quantity: usage.requests,
        unitPrice: usage.cost / Math.max(1, usage.requests),
        amount: Math.round(usage.cost * 100) / 100,
        period: { start: periodStart, end: periodEnd },
        metadata: { model, tokens: usage.tokens },
      });
    }

    const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = Math.round(amount * 0.08 * 100) / 100; // 8% tax example

    this.invoiceCounter++;
    const id = crypto.randomUUID();
    const now = new Date();
    const invoice: Invoice = {
      id, organizationId: orgId, subscriptionId: null,
      number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(this.invoiceCounter).padStart(4, '0')}`,
      status: 'open', amount: Math.round(amount * 100) / 100, tax, total: Math.round((amount + tax) * 100) / 100,
      currency: 'USD', lineItems,
      dueDate: new Date(now.getTime() + 30 * 86400_000), paidAt: null, pdfUrl: null,
      paymentMethodId: null, metadata: { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
      createdAt: now, updatedAt: now,
    };

    this.invoices.set(id, invoice);
    this.logger.info({ invoiceId: id, orgId, amount: invoice.total, lineItems: lineItems.length }, 'Invoice generated');
    return { success: true, data: invoice };
  }

  async get(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null;
  }

  async getByOrg(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<Invoice>> {
    const filtered = [...this.invoices.values()]
      .filter((i) => i.organizationId === orgId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(filtered.slice(start, start + pagination.limit), filtered.length, pagination);
  }

  async markPaid(id: string): Promise<Result<Invoice>> {
    const invoice = this.invoices.get(id);
    if (!invoice) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Invoice not found', timestamp: new Date() } };
    const updated = { ...invoice, status: 'paid' as const, paidAt: new Date(), updatedAt: new Date() };
    this.invoices.set(id, updated);
    this.logger.info({ invoiceId: id }, 'Invoice marked as paid');
    return { success: true, data: updated };
  }

  async void(id: string): Promise<Result<Invoice>> {
    const invoice = this.invoices.get(id);
    if (!invoice) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Invoice not found', timestamp: new Date() } };
    const updated = { ...invoice, status: 'void' as const, updatedAt: new Date() };
    this.invoices.set(id, updated);
    return { success: true, data: updated };
  }

  async generateSummary(orgId: string, period: string): Promise<{ totalAmount: number; totalInvoices: number; paidAmount: number; unpaidAmount: number }> {
    const invoices = [...this.invoices.values()].filter((i) => i.organizationId === orgId);
    return {
      totalAmount: invoices.reduce((s, i) => s + i.total, 0),
      totalInvoices: invoices.length,
      paidAmount: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
      unpaidAmount: invoices.filter((i) => i.status === 'open').reduce((s, i) => s + i.total, 0),
    };
  }

  private getUsageInRange(orgId: string, start: Date, end: Date): UsageRecord[] {
    // Access usage tracker's internal records
    return (this.usageTracker as any).records?.filter(
      (r: UsageRecord) => r.organizationId === orgId && r.createdAt >= start && r.createdAt <= end,
    ) ?? [];
  }
}
