/**
 * Request ID Middleware Tests
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestIdMiddleware } from '../../../middleware/request-id.js';

describe('requestIdMiddleware', () => {
  it('should generate request ID when none provided', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }));

    const res = await app.request('/test');
    const body = await res.json<{ requestId: string }>();

    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId.length).toBeGreaterThan(0);
    expect(res.headers.get('x-request-id')).toBe(body.requestId);
  });

  it('should use provided request ID', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }));

    const res = await app.request('/test', {
      headers: { 'x-request-id': 'custom-id-123' },
    });
    const body = await res.json<{ requestId: string }>();

    expect(body.requestId).toBe('custom-id-123');
    expect(res.headers.get('x-request-id')).toBe('custom-id-123');
  });
});
