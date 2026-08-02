/**
 * XSS Protection Service
 *
 * Content Security Policy generation and output sanitization.
 */

export class XssProtectionService {
  /**
   * Generate Content-Security-Policy header value.
   */
  generateCsp(nonce?: string): string {
    const directives: Record<string, string[]> = {
      'default-src': ["'self'"],
      'script-src': nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'", 'https://api.openai.com', 'https://api.anthropic.com', 'https://generativelanguage.googleapis.com'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
    };

    return Object.entries(directives)
      .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
      .join('; ');
  }

  /**
   * Sanitize user-generated HTML content.
   */
  sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize content for JSON embedding.
   */
  sanitizeForJson(input: string): string {
    return input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\0/g, '');
  }

  /**
   * Validate and sanitize URLs to prevent javascript: protocol attacks.
   */
  sanitizeUrl(url: string): string {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
      return '';
    }
    return url;
  }

  /**
   * Generate security headers.
   */
  getSecurityHeaders(nonce?: string): Record<string, string> {
    return {
      'Content-Security-Policy': this.generateCsp(nonce),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0', // Modern browsers rely on CSP instead
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    };
  }

  /**
   * Generate a cryptographic nonce.
   */
  generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString('base64');
  }
}
