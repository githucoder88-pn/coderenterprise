/**
 * Dashboard Routes
 *
 * All dashboard features: profiles, usage charts, activity, subscriptions.
 */

import { Hono } from 'hono';
import type { ServiceProvider } from '../../providers/service.provider.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createDashboardRouter(services: ServiceProvider, logger: ILogger): Hono {
  const app = new Hono();

  // ─── User Profile ─────────────────────────────────────────────────────────

  app.get('/profile', async (c) => {
    const user = c.get('user');
    const result = await services.users.getById(user.uid);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.patch('/profile', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await services.users.update(user.uid, body, user);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Organization Profile ─────────────────────────────────────────────────

  app.get('/organization', async (c) => {
    const user = c.get('user');
    const result = await services.organizations.getById(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.patch('/organization', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await services.organizations.update(user.organizationId, body, user);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── API Key Management ───────────────────────────────────────────────────

  app.get('/api-keys', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await services.apiKeys.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Provider Connections ─────────────────────────────────────────────────

  app.get('/providers', async (c) => {
    const providers = services.providers.registry.getAll().map((p) => ({
      name: p.name,
      capabilities: p.capabilities,
      configured: true,
    }));
    return c.json({ success: true, data: providers });
  });

  app.get('/providers/status', async (c) => {
    const stats = services.providers.registry.getStats();
    return c.json({ success: true, data: stats });
  });

  // ─── Usage Charts ─────────────────────────────────────────────────────────

  app.get('/usage/summary', async (c) => {
    const user = c.get('user');
    const period = c.req.query('period') ?? new Date().toISOString().slice(0, 7);
    const [usage, convStats] = await Promise.all([
      services.analytics.getUsageMetrics(user.organizationId, period),
      services.conversations.getStats(user.uid),
    ]);
    return c.json({
      success: true,
      data: {
        usage: usage.success ? usage.data : null,
        conversations: convStats.success ? convStats.data : null,
      },
    });
  });

  app.get('/usage/daily', async (c) => {
    const user = c.get('user');
    const days = Number(c.req.query('days') ?? 30);
    const result = await services.analytics.getUsageMetrics(user.organizationId, `daily:${days}`);
    return c.json({ success: true, data: result.data });
  });

  // ─── Spending Analytics ───────────────────────────────────────────────────

  app.get('/spending', async (c) => {
    const user = c.get('user');
    const plans = await services.billing.getPlans();
    const subscription = await services.billing.getSubscription(user.organizationId);
    return c.json({
      success: true,
      data: {
        plans: plans.success ? plans.data : [],
        subscription: subscription.success ? subscription.data : null,
      },
    });
  });

  // ─── Activity Logs ────────────────────────────────────────────────────────

  app.get('/activity', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const result = await services.audit.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Model Management ────────────────────────────────────────────────────

  app.get('/models', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    const provider = c.req.query('provider');
    const capability = c.req.query('capability');

    let result;
    if (provider) {
      result = await services.models.listByProvider(provider, { page, limit });
    } else if (capability) {
      result = await services.models.listByCapability(capability, { page, limit });
    } else {
      result = await services.models.listActive({ page, limit });
    }
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/models/search', async (c) => {
    const q = c.req.query('q') ?? '';
    const result = await services.models.search(q);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Subscription Management ──────────────────────────────────────────────

  app.get('/subscription', async (c) => {
    const user = c.get('user');
    const result = await services.billing.getSubscription(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/subscription/checkout', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await services.billing.createCheckoutSession(user.organizationId, body.planId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/subscription/cancel', async (c) => {
    const user = c.get('user');
    const result = await services.billing.cancelSubscription(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  app.get('/notifications', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const unreadOnly = c.req.query('unread') === 'true';
    const result = await services.notifications.listByUser(user.uid, { page, limit }, unreadOnly);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/notifications/unread-count', async (c) => {
    const user = c.get('user');
    const result = await services.notifications.getUnreadCount(user.uid);
    return c.json({ success: true, data: { count: result.data ?? 0 } });
  });

  app.post('/notifications/:id/read', async (c) => {
    await services.notifications.markRead(c.req.param('id'));
    return c.json({ success: true });
  });

  app.post('/notifications/mark-all-read', async (c) => {
    const user = c.get('user');
    const result = await services.notifications.markAllRead(user.uid);
    return c.json({ success: true, data: { count: result.data ?? 0 } });
  });

  // ─── Conversations ────────────────────────────────────────────────────────

  app.get('/conversations', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await services.conversations.listByUser(user.uid, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Prompts ──────────────────────────────────────────────────────────────

  app.get('/prompts', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await services.prompts.listByOrganization(user.organizationId, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  return app;
}
