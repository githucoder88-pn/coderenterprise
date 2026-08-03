/**
 * Extension Platform API Routes
 */

import { Hono } from 'hono';
import type { ExtensionRegistry } from '../../extensions/registry/extension-registry.js';
import type { ExtensionLifecycleManager } from '../../extensions/lifecycle/extension-lifecycle.js';
import type { PermissionManager } from '../../extensions/permissions/permission-manager.js';
import type { MessageBus } from '../../extensions/messaging/message-bus.js';
import type { ExtensionMarketplace } from '../../extensions/marketplace/extension-marketplace.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createExtensionRouter(
  registry: ExtensionRegistry,
  lifecycle: ExtensionLifecycleManager,
  permissions: PermissionManager,
  messageBus: MessageBus,
  marketplace: ExtensionMarketplace,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Installed Extensions ───────────────────────────────────────────────

  app.get('/', (c) => {
    const kind = c.req.query('kind');
    const status = c.req.query('status');
    let extensions = registry.getAll();
    if (kind) extensions = extensions.filter((e) => e.manifest.kind === kind);
    if (status) extensions = extensions.filter((e) => e.status === status);
    return c.json({ success: true, data: extensions });
  });

  app.get('/stats', (c) => c.json({ success: true, data: registry.getStats() }));

  app.get('/:id', (c) => {
    const ext = registry.get(c.req.param('id'));
    if (!ext) throw createError(ErrorCode.NOT_FOUND, 'Extension not found');
    return c.json({ success: true, data: ext });
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  app.post('/:id/activate', async (c) => {
    const result = await lifecycle.activate(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/:id/deactivate', async (c) => {
    const result = await lifecycle.deactivate(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/:id/reload', async (c) => {
    const result = await lifecycle.reload(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.delete('/:id', async (c) => {
    const result = await lifecycle.uninstall(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/:id/enable', (c) => {
    const result = lifecycle.enable(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.post('/:id/disable', (c) => {
    const result = lifecycle.disable(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Permissions ────────────────────────────────────────────────────────

  app.get('/:id/permissions', (c) => {
    const id = c.req.param('id');
    return c.json({
      success: true,
      data: { granted: permissions.getGranted(id), pending: permissions.getPending(id) },
    });
  });

  app.post('/:id/permissions/grant', (c) => {
    const body = c.req.json() as any;
    permissions.grant(c.req.param('id'), body.permission);
    return c.json({ success: true });
  });

  app.post('/:id/permissions/revoke', (c) => {
    const body = c.req.json() as any;
    permissions.revoke(c.req.param('id'), body.permission);
    return c.json({ success: true });
  });

  // ─── Events ─────────────────────────────────────────────────────────────

  app.get('/:id/events', (c) => {
    const events = lifecycle.getEventHistory(c.req.param('id'));
    return c.json({ success: true, data: events });
  });

  // ─── Messages ───────────────────────────────────────────────────────────

  app.post('/messages/publish', async (c) => {
    const body = await c.req.json();
    await messageBus.publish(body.from, body.channel, body.payload);
    return c.json({ success: true });
  });

  app.get('/messages/:channel', (c) => {
    const history = messageBus.getMessageHistory(c.req.param('channel'));
    return c.json({ success: true, data: history });
  });

  // ─── Marketplace ────────────────────────────────────────────────────────

  app.get('/marketplace/search', async (c) => {
    const q = c.req.query('q') ?? '';
    const page = Number(c.req.query('page') ?? 1);
    const result = await marketplace.search(q, { page, limit: 20 });
    return c.json({ success: true, data: result });
  });

  app.get('/marketplace/featured', async (c) => {
    const result = await marketplace.getFeatured();
    return c.json({ success: true, data: result });
  });

  app.get('/marketplace/popular', async (c) => {
    const result = await marketplace.getPopular();
    return c.json({ success: true, data: result });
  });

  app.get('/marketplace/categories', async (c) => {
    const result = await marketplace.getCategories();
    return c.json({ success: true, data: result });
  });

  app.get('/marketplace/:id', async (c) => {
    const ext = await marketplace.getById(c.req.param('id'));
    if (!ext) throw createError(ErrorCode.NOT_FOUND, 'Extension not found in marketplace');
    return c.json({ success: true, data: ext });
  });

  app.get('/marketplace/:id/reviews', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const result = await marketplace.getReviews(c.req.param('id'), { page, limit: 20 });
    return c.json({ success: true, data: result });
  });

  app.post('/marketplace/:id/rate', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await marketplace.rate(c.req.param('id'), user.uid, body.rating, body.title ?? '', body.body ?? '');
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  return app;
}
