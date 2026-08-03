/**
 * Billing Routes
 */

import { Hono } from 'hono';
import type { IBillingService } from '../../modules/billing/billing.service.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createBillingRouter(billingService: IBillingService, _logger: ILogger): Hono {
  const router = new Hono();

  // GET /billing/plans
  router.get('/plans', async (c) => {
    const result = await billingService.getPlans();
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /billing/plans/:id
  router.get('/plans/:id', async (c) => {
    const result = await billingService.getPlan(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // GET /billing/subscription
  router.get('/subscription', async (c) => {
    const user = c.get('user');
    const result = await billingService.getSubscription(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  // POST /billing/checkout
  router.post('/checkout', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await billingService.createCheckoutSession(user.organizationId, body.planId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // POST /billing/subscription/cancel
  router.post('/subscription/cancel', async (c) => {
    const user = c.get('user');
    const result = await billingService.cancelSubscription(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // POST /billing/usage
  router.post('/usage', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await billingService.reportUsage({
      organizationId: user.organizationId,
      metric: body.metric,
      quantity: body.quantity,
      timestamp: new Date(),
    });
    if (!result.success) throw result.error;
    return c.json({ success: true }, 200);
  });

  // GET /billing/usage/check
  router.get('/usage/check', async (c) => {
    const user = c.get('user');
    const result = await billingService.checkUsageLimits(user.organizationId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 200);
  });

  return router;
}
