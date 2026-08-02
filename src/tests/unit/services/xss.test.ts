/**
 * XSS Protection Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XssProtectionService } from '../../../services/security/xss-protection.js';

describe('XssProtectionService', () => {
  let xss: XssProtectionService;

  beforeEach(() => {
    xss = new XssProtectionService();
  });

  describe('generateCsp', () => {
    it('should generate a valid CSP header', () => {
      const csp = xss.generateCsp();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should include nonce when provided', () => {
      const csp = xss.generateCsp('abc123');
      expect(csp).toContain("'nonce-abc123'");
      expect(csp).toContain("'strict-dynamic'");
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      expect(xss.sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should handle ampersands', () => {
      expect(xss.sanitizeHtml('a & b')).toBe('a &amp; b');
    });

    it('should handle empty input', () => {
      expect(xss.sanitizeHtml('')).toBe('');
    });
  });

  describe('sanitizeForJson', () => {
    it('should escape JSON special characters', () => {
      expect(xss.sanitizeForJson('line\nnew\ttab')).toBe('line\\nnew\\ttab');
    });

    it('should escape quotes and backslashes', () => {
      expect(xss.sanitizeForJson('say "hello"')).toBe('say \\"hello\\"');
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: URLs', () => {
      expect(xss.sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
      expect(xss.sanitizeUrl('data:text/html,<script>')).toBe('');
    });

    it('should allow normal URLs', () => {
      expect(xss.sanitizeUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return all required security headers', () => {
      const headers = xss.getSecurityHeaders();
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Strict-Transport-Security']).toContain('max-age=');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonces = new Set(Array.from({ length: 100 }, () => xss.generateNonce()));
      expect(nonces.size).toBe(100);
    });
  });
});
