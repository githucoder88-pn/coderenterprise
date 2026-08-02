import { Hono } from 'hono';
import type { INotificationService } from '../../modules/notifications/notification.service.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createNotificationRouter(notif: INotificationService, _logger: ILogger): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const unread = c.req.query('unread') === 'true';
    const result = await notif.listByUser(user.uid, { page, limit }, unread);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/unread-count', async (c) => {
    const user = c.get('user');
    const result = await notif.getUnreadCount(user.uid);
    return c.json({ success: true, data: { count: result.data ?? 0 } });
  });

  app.post('/:id/read', async (c) => {
    await notif.markRead(c.req.param('id'));
    return c.json({ success: true });
  });

  app.post('/mark-all-read', async (c) => {
    const user = c.get('user');
    const result = await notif.markAllRead(user.uid);
    return c.json({ success: true, data: { count: result.data ?? 0 } });
  });

  app.get('/preferences', async (c) => {
    const user = c.get('user');
    const result = await notif.getPreferences(user.uid);
    return c.json({ success: true, data: result.data });
  });

  app.patch('/preferences', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await notif.updatePreferences(user.uid, body);
    return c.json({ success: true, data: result.data });
  });

  return app;
}
