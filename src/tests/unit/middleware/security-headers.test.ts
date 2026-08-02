/**
 * Security Headers Middleware Tests
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeadersMiddleware } from '../../../middleware/security-headers.js';

describe('securityHeadersMiddleware', () => {
  it('should set all security headers', async () => {
    const app = new Hono();
    app.use('*', securityHeadersMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-xss-protection')).toBe('0');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=63072000');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toBeDefined();
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});
