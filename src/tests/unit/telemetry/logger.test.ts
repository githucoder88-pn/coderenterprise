/**
 * Logger Tests
 */

import { describe, it, expect } from 'vitest';
import { createLogger } from '../../../telemetry/logger.js';

describe('createLogger', () => {
  it('should create a logger with default config', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('should create child logger', () => {
    const logger = createLogger();
    const child = logger.child({ requestId: 'test-123' });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });

  it('should not throw when logging', () => {
    const logger = createLogger({ level: 'silent' });
    expect(() => {
      logger.info('test message');
      logger.error({ err: new Error('test') }, 'error occurred');
      logger.debug('debug message');
      logger.warn('warning');
    }).not.toThrow();
  });
});
