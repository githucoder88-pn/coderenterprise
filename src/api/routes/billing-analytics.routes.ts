/**
 * Billing & Analytics API Routes
 */

import { Hono } from 'hono';
import type { UsageTracker } from '../../analytics/usage-tracker.js';
import type { QuotaService } from '../../analytics/quota-service.js';
import type { SubscriptionService } from '../../analytics/subscription-service.js';
import type { InvoiceService } from '../../analytics/invoice-service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IObservability } from '../../telemetry/observability.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createBillingAnalyticsRouter(
  usage: UsageTracker,
  quotas: QuotaService,
  subscriptions: SubscriptionService,
  invoices: InvoiceService,
  observability: IObservability,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Usage Analytics ───────────────────────────────────────────────────

  app.get('/usage', async (c) => {
    const user = c.get('user');
    const period = c.req.query('period') ?? new Date().toISOString().slice(0, 7);
    const summary = await usage.getSummary(user.organizationId, period);
    return c.json({ success: true, data: summary });
  });

  app.get('/usage/records', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await usage.getRecords(user.organizationId, { page, limit });
    return c.json({ success: true, data: result });
  });

  app.get('/usage/models', async (c) => {
    const user = c.get('user');
    const period = c.req.query('period') ?? new Date().toISOString().slice(0, 7);
    const stats = await usage.getModelStats(user.organizationId, period);
    return c.json({ success: true, data: stats });
  });

  app.post('/usage/estimate', async (c) => {
    const body = await c.req.json();
    const estimate = usage.estimateCost(body.model, body.provider, body.promptTokens ?? 0, body.completionTokens ?? 0, body.cachedTokens ?? 0);
    return c.json({ success: true, data: estimate });
  });

  app.get('/pricing', async (c) => {
    return c.json({ success: true, data: usage.getPricingTable() });
  });

  // ─── Quotas ────────────────────────────────────────────────────────────

  app.get('/quotas', async (c) => {
    const user = c.get('user');
    const q = quotas.getQuotas(user.organizationId);
    const usageData = quotas.getUsage(user.organizationId);
    return c.json({ success: true, data: { quotas: q, usage: usageData } });
  });

  app.post('/quotas', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = quotas.setQuota(user.organizationId, body.metric, body.limit, body.period, body.hardLimit);
    if (!result.success) throw createError(ErrorCode.VALIDATION, 'Failed to set quota');
    return c.json({ success: true, data: result.data });
  });

  app.post('/quotas/check', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await quotas.checkQuota(user.organizationId, body.metric, body.amount ?? 1);
    return c.json({ success: true, data: result });
  });

  app.post('/quotas/reset', async (c) => {
    const user = c.get('user');
    await quotas.resetAll(user.organizationId);
    return c.json({ success: true });
  });

  // ─── Subscriptions ─────────────────────────────────────────────────────

  app.get('/subscriptions', async (c) => {
    const user = c.get('user');
    const sub = await subscriptions.get(user.organizationId);
    return c.json({ success: true, data: sub });
  });

  app.get('/subscriptions/plans', async (c) => {
    return c.json({ success: true, data: subscriptions.listPlans() });
  });

  app.get('/subscriptions/plans/:id', async (c) => {
    const plan = subscriptions.getPlan(c.req.param('id'));
    if (!plan) throw createError(ErrorCode.NOT_FOUND, 'Plan not found');
    return c.json({ success: true, data: plan });
  });

  app.post('/subscriptions', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await subscriptions.create(user.organizationId, body.planId, body.trialDays);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/subscriptions/upgrade', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await subscriptions.upgrade(user.organizationId, body.planId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/subscriptions/downgrade', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await subscriptions.downgrade(user.organizationId, body.planId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/subscriptions/cancel', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await subscriptions.cancel(user.organizationId, body.immediate);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/subscriptions/reactivate', async (c) => {
    const user = c.get('user');
    const result = await subscriptions.reactivate(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Invoices ──────────────────────────────────────────────────────────

  app.get('/invoices', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await invoices.getByOrg(user.organizationId, { page, limit });
    return c.json({ success: true, data: result });
  });

  app.get('/invoices/:id', async (c) => {
    const invoice = await invoices.get(c.req.param('id'));
    if (!invoice) throw createError(ErrorCode.NOT_FOUND, 'Invoice not found');
    return c.json({ success: true, data: invoice });
  });

  app.post('/invoices/generate', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await invoices.generate(user.organizationId, new Date(body.periodStart), new Date(body.periodEnd));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/invoices/:id/pay', async (c) => {
    const result = await invoices.markPaid(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/invoices/summary', async (c) => {
    const user = c.get('user');
    const period = c.req.query('period') ?? new Date().toISOString().slice(0, 7);
    const summary = await invoices.generateSummary(user.organizationId, period);
    return c.json({ success: true, data: summary });
  });

  // ─── Observability ─────────────────────────────────────────────────────

  app.get('/health/metrics', (c) => {
    return c.json({ success: true, data: observability.getHealthMetrics() });
  });

  app.get('/metrics/prometheus', (_c) => {
    return new Response(observability.prometheus.export(), {
      headers: { 'Content-Type': 'text/plain; version=0.0.4' },
    });
  });

  return app;
}
