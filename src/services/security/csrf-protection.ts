/**
 * CSRF Protection Service
 *
 * Double-submit cookie pattern with cryptographic tokens.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ILogger } from '../../telemetry/logger.js';

interface CsrfToken {
  readonly token: string;
  readonly expiresAt: number;
}

export class CsrfProtectionService {
  private readonly secret: string;

  constructor(secret: string, _logger: ILogger) {
    this.secret = secret;
  }

  generateToken(sessionId: string): CsrfToken {
    const payload = `${sessionId}:${Date.now()}:${randomBytes(16).toString('hex')}`;
    const signature = createHmac('sha256', this.secret).update(payload).digest('hex');
    const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
    const expiresAt = Date.now() + 3600_000; // 1 hour

    return { token, expiresAt };
  }

  validateToken(token: string, sessionId: string): boolean {
    try {
      const [encodedPayload, signature] = token.split('.');
      if (!encodedPayload || !signature) return false;

      const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const expectedSignature = createHmac('sha256', this.secret).update(payload).digest('hex');

      // Timing-safe comparison
      if (signature.length !== expectedSignature.length) return false;
      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      if (sigBuf.length !== expectedBuf.length) return false;
      if (!timingSafeEqual(sigBuf, expectedBuf)) {
        return false;
      }

      // Validate session ID
      const parts = payload.split(':');
      if (parts[0] !== sessionId) return false;

      // Validate expiration
      const timestamp = parseInt(parts[1] ?? '0', 10);
      if (Date.now() - timestamp > 3600_000) return false;

      return true;
    } catch {
      return false;
    }
  }

  getCookieOptions(): {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict';
    maxAge: number;
    path: string;
  } {
    return {
      name: '__csrf',
      httpOnly: false, // Must be readable by JS for double-submit
      secure: true,
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    };
  }
}
