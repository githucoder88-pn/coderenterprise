/**
 * XSS Protection Edge Cases
 */

import { describe, it, expect } from 'vitest';
import { XssProtectionService } from '../../../services/security/xss-protection.js';

describe('XssProtectionService — edge cases', () => {
  const xss = new XssProtectionService();

  it('should handle nested HTML tags', () => {
    expect(xss.sanitizeHtml('<div><script>alert(1)</script></div>')).not.toContain('<script>');
  });

  it('should handle event handlers', () => {
    const result = xss.sanitizeHtml('<img onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('should handle encoded attacks in URLs', () => {
    expect(xss.sanitizeUrl('java%0ascript:alert(1)')).toBe('java%0ascript:alert(1)'); // Not javascript: prefix
    expect(xss.sanitizeUrl('JavaScript:alert(1)')).toBe(''); // Case insensitive
  });

  it('should generate different nonces each time', () => {
    const n1 = xss.generateNonce();
    const n2 = xss.generateNonce();
    expect(n1).not.toBe(n2);
  });

  it('should include COEP/CORP headers', () => {
    const headers = xss.getSecurityHeaders();
    expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });
});
