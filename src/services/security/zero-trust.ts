/**
 * Zero-Trust Security Service
 *
 * Every request is authenticated, authorized, and validated regardless of origin.
 * No implicit trust for internal networks.
 */

import type { ILogger } from '../../telemetry/logger.js';
import type { IRedisClient } from '../../infrastructure/redis/redis-client.js';
import type { AuthenticatedUser, Permission } from '../../types/index.js';

interface SecurityContext {
  readonly user: AuthenticatedUser;
  readonly ip: string;
  readonly userAgent: string;
  readonly requestId: string;
  readonly timestamp: Date;
  readonly path: string;
  readonly method: string;
}

interface SecurityPolicy {
  readonly requireAuth: boolean;
  readonly requiredPermissions: readonly Permission[];
  readonly allowedIpRanges?: readonly string[];
  readonly requireMfa?: boolean;
  readonly maxSessionAge?: number;
  readonly allowedOrigins?: readonly string[];
}

interface SecurityVerdict {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly riskScore: number; // 0-100
  readonly flags: readonly string[];
}

export class ZeroTrustService {
  constructor(
    private readonly redis: IRedisClient,
    private readonly logger: ILogger,
  ) {}

  async evaluate(context: SecurityContext, policy: SecurityPolicy): Promise<SecurityVerdict> {
    const flags: string[] = [];
    let riskScore = 0;

    // 1. Authentication check
    if (policy.requireAuth && !context.user) {
      return { allowed: false, reason: 'Authentication required', riskScore: 100, flags: ['unauthenticated'] };
    }

    // 2. Authorization check
    if (policy.requiredPermissions.length > 0 && context.user) {
      const hasPermission = policy.requiredPermissions.some(
        (p) => context.user.permissions.includes(p) || context.user.permissions.includes('admin:all'),
      );
      if (!hasPermission) {
        return { allowed: false, reason: 'Insufficient permissions', riskScore: 90, flags: ['unauthorized'] };
      }
    }

    // 3. IP reputation check
    const ipBlocked = await this.isIpBlocked(context.ip);
    if (ipBlocked) {
      return { allowed: false, reason: 'IP blocked', riskScore: 100, flags: ['blocked_ip'] };
    }

    // 4. IP range check
    if (policy.allowedIpRanges?.length) {
      const inRange = this.isIpInRange(context.ip, policy.allowedIpRanges);
      if (!inRange) {
        riskScore += 30;
        flags.push('ip_outside_range');
      }
    }

    // 5. Session validation
    if (policy.maxSessionAge && context.user) {
      const sessionAge = await this.getSessionAge(context.user.uid);
      if (sessionAge > policy.maxSessionAge) {
        return { allowed: false, reason: 'Session expired', riskScore: 80, flags: ['session_expired'] };
      }
    }

    // 6. User-agent analysis
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      riskScore += 20;
      flags.push('suspicious_user_agent');
    }

    // 7. Device fingerprint check
    const deviceKnown = await this.isKnownDevice(context.user?.uid ?? '', context.userAgent);
    if (!deviceKnown && context.user) {
      riskScore += 15;
      flags.push('unknown_device');
    }

    // 8. Request velocity check
    const velocity = await this.checkRequestVelocity(context.ip);
    if (velocity.exceeded) {
      riskScore += 25;
      flags.push('high_velocity');
    }

    // 9. Geo anomaly check
    const geoAnomaly = await this.checkGeoAnomaly(context.user?.uid ?? '', context.ip);
    if (geoAnomaly) {
      riskScore += 20;
      flags.push('geo_anomaly');
    }

    return {
      allowed: riskScore < 80,
      reason: riskScore >= 80 ? 'Risk score too high' : undefined,
      riskScore: Math.min(100, riskScore),
      flags,
    };
  }

  async blockIp(ip: string, durationSeconds: number, reason: string): Promise<void> {
    await this.redis.set(`security:blocked_ip:${ip}`, reason, durationSeconds);
    this.logger.warn({ ip, reason }, 'IP blocked by zero-trust');
  }

  async reportSuspiciousActivity(userId: string, ip: string, reason: string): Promise<void> {
    const key = `security:suspicious:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 3600);
    if (count >= 5) {
      await this.blockIp(ip, 3600, `Auto-blocked: ${reason}`);
    }
    this.logger.warn({ userId, ip, reason, count }, 'Suspicious activity reported');
  }

  private async isIpBlocked(ip: string): Promise<boolean> {
    return this.redis.exists(`security:blocked_ip:${ip}`);
  }

  private isIpInRange(ip: string, ranges: readonly string[]): boolean {
    // Simplified CIDR check
    return ranges.some((range) => {
      if (range === '*') return true;
      const [subnet] = range.split('/');
      return ip.startsWith(subnet?.split('.').slice(0, 2).join('.') ?? '');
    });
  }

  private isSuspiciousUserAgent(ua: string): boolean {
    if (!ua || ua.length < 10) return true;
    const suspicious = ['curl', 'wget', 'python-requests', 'scrapy', 'bot'];
    return suspicious.some((s) => ua.toLowerCase().includes(s));
  }

  private async isKnownDevice(userId: string, userAgent: string): Promise<boolean> {
    if (!userId) return true;
    const key = `security:devices:${userId}`;
    const known = await this.redis.getClient().sismember(key, userAgent);
    if (!known) {
      await this.redis.getClient().sadd(key, userAgent);
      await this.redis.expire(key, 90 * 86400);
    }
    return known === 1;
  }

  private async getSessionAge(userId: string): Promise<number> {
    const key = `security:session:${userId}`;
    const data = await this.redis.get(key);
    if (!data) return Infinity;
    return Date.now() - parseInt(data, 10);
  }

  private async checkRequestVelocity(ip: string): Promise<{ exceeded: boolean; count: number }> {
    const key = `security:velocity:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    return { exceeded: count > 100, count };
  }

  private async checkGeoAnomaly(_userId: string, _ip: string): Promise<boolean> {
    // In production, use MaxMind GeoIP
    return false;
  }
}
