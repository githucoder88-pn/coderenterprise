/**
 * Config Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, resetConfig } from '../../../config/index.js';

describe('Config', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('should load config with defaults', () => {
    // Set required env vars
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars!!';
    process.env['ENCRYPTION_KEY'] = 'test-encryption-key-at-least-32-bytes!';

    const config = loadConfig();

    expect(config.node.port).toBe(3000);
    expect(config.node.host).toBe('0.0.0.0');
    expect(config.api.prefix).toBe('/api/v1');
    expect(config.rateLimit.maxRequests).toBe(100);
    expect(config.cors.credentials).toBe(true);
  });

  it('should use env vars when available', () => {
    process.env['PORT'] = '8080';
    process.env['LOG_LEVEL'] = 'debug';
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars!!';
    process.env['ENCRYPTION_KEY'] = 'test-encryption-key-at-least-32-bytes!';

    const config = loadConfig();

    expect(config.node.port).toBe(8080);
    expect(config.logging.level).toBe('debug');
  });

  it('should apply overrides', () => {
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars!!';
    process.env['ENCRYPTION_KEY'] = 'test-encryption-key-at-least-32-bytes!';

    const config = loadConfig({
      node: { env: 'test', port: 4000, host: 'localhost' } as any,
    });

    expect(config.node.port).toBe(4000);
  });

  it('should validate required fields', () => {
    delete process.env['JWT_SECRET'];
    delete process.env['ENCRYPTION_KEY'];

    expect(() => loadConfig()).toThrow();
  });

  it('should parse CORS origins as array', () => {
    process.env['CORS_ORIGINS'] = 'http://a.com, http://b.com';
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-chars!!';
    process.env['ENCRYPTION_KEY'] = 'test-encryption-key-at-least-32-bytes!';

    const config = loadConfig();
    expect(config.cors.origins).toEqual(['http://a.com', 'http://b.com']);
  });
});
