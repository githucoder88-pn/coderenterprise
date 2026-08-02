/**
 * Result Pattern Tests
 */

import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, ErrorCode, createError } from '../../../types/index.js';

describe('Result', () => {
  describe('ok', () => {
    it('should create a success result', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should handle null data', () => {
      const result = ok(null);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle complex objects', () => {
      const data = { name: 'test', nested: { value: 1 } };
      const result = ok(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });
  });

  describe('err', () => {
    it('should create an error result', () => {
      const error = createError(ErrorCode.NOT_FOUND, 'Not found');
      const result = err(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
      }
    });
  });

  describe('unwrap', () => {
    it('should return data from success result', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw from error result', () => {
      const error = createError(ErrorCode.NOT_FOUND, 'Not found');
      const result = err(error);
      expect(() => unwrap(result)).toThrow();
    });
  });

  describe('createError', () => {
    it('should create error with code and message', () => {
      const error = createError(ErrorCode.VALIDATION, 'Invalid input');
      expect(error.code).toBe(ErrorCode.VALIDATION);
      expect(error.message).toBe('Invalid input');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = createError(ErrorCode.VALIDATION, 'Invalid input', details);
      expect(error.details).toEqual(details);
    });

    it('should create error with cause', () => {
      const cause = new Error('original');
      const error = createError(ErrorCode.INTERNAL, 'Internal error', undefined, cause);
      expect(error.cause).toBe(cause);
    });
  });
});
