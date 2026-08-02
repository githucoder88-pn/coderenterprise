/**
 * CSRF Protection Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CsrfProtectionService } from '../../../services/security/csrf-protection.js';
import { createMockLogger } from '../../helpers.js';

describe('CsrfProtectionService', () => {
  let csrf: CsrfProtectionService;

  beforeEach(() => {
    csrf = new CsrfProtectionService('test-csrf-secret-key-32-chars!!', createMockLogger());
  });

  describe('generateToken / validateToken', () => {
    it('should generate and validate a token', () => {
      const sessionId = 'user-123';
      const { token } = csrf.generateToken(sessionId);
      expect(csrf.validateToken(token, sessionId)).toBe(true);
    });

    it('should reject token with wrong session ID', () => {
      const { token } = csrf.generateToken('user-1');
      expect(csrf.validateToken(token, 'user-2')).toBe(false);
    });

    it('should reject tampered token', () => {
      const { token } = csrf.generateToken('user-1');
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(csrf.validateToken(tampered, 'user-1')).toBe(false);
    });

    it('should reject malformed token', () => {
      expect(csrf.validateToken('not-a-token', 'user-1')).toBe(false);
      expect(csrf.validateToken('', 'user-1')).toBe(false);
    });
  });

  describe('getCookieOptions', () => {
    it('should return secure cookie options', () => {
      const opts = csrf.getCookieOptions();
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.httpOnly).toBe(false); // Must be readable by JS
      expect(opts.maxAge).toBeGreaterThan(0);
    });
  });
});
