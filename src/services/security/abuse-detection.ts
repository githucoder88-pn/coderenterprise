/**
 * Abuse Detection Service
 *
 * Detects and prevents API abuse, token farming, scraping, and DDoS.
 */

import type { ILogger } from '../../telemetry/logger.js';
import type { IRedisClient } from '../../infrastructure/redis/redis-client.js';

interface AbuseSignal {
  readonly type: 'rate_abuse' | 'token_farming' | 'scraping' | 'credential_stuffing' | 'ddos' | 'data_exfil';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly evidence: Record<string, unknown>;
  readonly timestamp: Date;
}

interface AbuseAction {
  readonly action: 'allow' | 'throttle' | 'captcha' | 'block' | 'alert';
  readonly duration?: number;
  readonly reason: string;
}

export class AbuseDetectionService {
  constructor(
    private readonly redis: IRedisClient,
    private readonly logger: ILogger,
  ) {}

  async analyzeRequest(
    userId: string | undefined,
    ip: string,
    path: string,
    method: string,
    bodySize: number,
    tokensUsed: number,
  ): Promise<AbuseAction> {
    // 1. Check IP reputation
    const ipScore = await this.getIpAbuseScore(ip);
    if (ipScore >= 90) {
      return { action: 'block', duration: 3600, reason: 'IP abuse score exceeded threshold' };
    }

    // 2. Token farming detection
    if (tokensUsed > 0 && userId) {
      const tokenAction = await this.detectTokenFarming(userId, tokensUsed);
      if (tokenAction) return tokenAction;
    }

    // 3. Scraping detection
    const scrapingAction = await this.detectScraping(ip, path);
    if (scrapingAction) return scrapingAction;

    // 4. Credential stuffing detection
    const credAction = await this.detectCredentialStuffing(ip, path);
    if (credAction) return credAction;

    // 5. Request pattern analysis
    const patternAction = await this.analyzePattern(userId ?? ip, path, method);
    if (patternAction) return patternAction;

    // 6. Body size anomaly
    if (bodySize > 1_000_000) {
      return { action: 'throttle', reason: 'Oversized request body' };
    }

    return { action: 'allow', reason: 'No abuse detected' };
  }

  async reportAbuse(signal: AbuseSignal): Promise<void> {
    const key = `abuse:${signal.type}:${signal.severity}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400);

    this.logger.warn({ signal }, `Abuse detected: ${signal.type}`);

    if (signal.severity === 'critical') {
      this.logger.fatal({ signal }, 'Critical abuse detected — alerting');
    }
  }

  async getAbuseStats(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('abuse:*');
    const stats: Record<string, number> = {};
    for (const key of keys) {
      const value = await this.redis.get(key);
      stats[key.replace(/^.*?abuse:/, '')] = parseInt(value ?? '0', 10);
    }
    return stats;
  }

  private async getIpAbuseScore(ip: string): Promise<number> {
    const score = await this.redis.get(`abuse:ip_score:${ip}`);
    return parseInt(score ?? '0', 10);
  }

  private async detectTokenFarming(userId: string, tokensUsed: number): Promise<AbuseAction | null> {
    const key = `abuse:tokens:${userId}`;
    const total = await this.redis.incrBy(key, tokensUsed);
    if (total === tokensUsed) await this.redis.expire(key, 3600);

    if (total > 500_000) {
      return { action: 'block', duration: 3600, reason: 'Token farming detected: excessive token usage' };
    }
    if (total > 100_000) {
      return { action: 'throttle', reason: 'High token consumption rate' };
    }
    return null;
  }

  private async detectScraping(ip: string, _path: string): Promise<AbuseAction | null> {
    const key = `abuse:scrape:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);

    if (count > 200) {
      return { action: 'captcha', reason: 'Potential scraping: high request rate' };
    }
    return null;
  }

  private async detectCredentialStuffing(ip: string, path: string): Promise<AbuseAction | null> {
    if (!path.includes('sign-in') && !path.includes('login')) return null;

    const key = `abuse:auth:${ip}`;
    const failures = await this.redis.incr(key);
    if (failures === 1) await this.redis.expire(key, 900);

    if (failures >= 20) {
      return { action: 'block', duration: 3600, reason: 'Credential stuffing detected' };
    }
    if (failures >= 5) {
      return { action: 'captcha', reason: 'Multiple failed auth attempts' };
    }
    return null;
  }

  private async analyzePattern(identifier: string, path: string, _method: string): Promise<AbuseAction | null> {
    const key = `abuse:pattern:${identifier}`;
    const patterns = await this.redis.get(key);

    if (patterns) {
      const parsed = JSON.parse(patterns) as { paths: string[]; count: number };
      parsed.paths.push(path);
      parsed.count++;

      // Check for rapid path enumeration
      const uniquePaths = new Set(parsed.paths.slice(-50)).size;
      if (uniquePaths > 40) {
        return { action: 'throttle', reason: 'Path enumeration pattern detected' };
      }

      await this.redis.set(key, JSON.stringify(parsed), 300);
    } else {
      await this.redis.set(key, JSON.stringify({ paths: [path], count: 1 }), 300);
    }

    return null;
  }
}
