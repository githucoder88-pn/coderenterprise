/**
 * Security Manager
 *
 * Key management, secret rotation, intrusion detection, certificate management.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SecurityPolicy } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface ISecurityManager {
  createPolicy(orgId: string): SecurityPolicy;
  getPolicy(orgId: string): SecurityPolicy | null;
  updatePolicy(orgId: string, updates: Partial<SecurityPolicy>): Result<SecurityPolicy>;
  validatePassword(orgId: string, password: string): { valid: boolean; violations: readonly string[] };
  encrypt(plaintext: string, orgId: string): { encrypted: string; iv: string; tag: string };
  decrypt(encrypted: string, iv: string, tag: string, orgId: string): string;
  rotateKey(orgId: string): string;
  checkIpAllowed(orgId: string, ip: string): boolean;
  detectIntrusion(orgId: string, userId: string, ip: string, action: string): { threat: boolean; severity: 'low' | 'medium' | 'high'; reason: string };
  getAuditEvents(orgId: string, limit?: number): readonly { timestamp: Date; event: string; userId: string; ip: string; details: string }[];
}

export class SecurityManager implements ISecurityManager {
  private readonly policies = new Map<string, SecurityPolicy>();
  private readonly keys = new Map<string, Buffer>();
  private readonly auditEvents = new Map<string, { timestamp: Date; event: string; userId: string; ip: string; details: string }[]>();
  private readonly failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  constructor(
    private readonly logger: ILogger,
  ) {}

  createPolicy(orgId: string): SecurityPolicy {
    const now = new Date();
    const policy: SecurityPolicy = {
      id: crypto.randomUUID(), organizationId: orgId,
      mfaRequired: false,
      passwordPolicy: {
        minLength: 12, requireUppercase: true, requireLowercase: true,
        requireNumbers: true, requireSpecial: true, maxAgeDays: 90, preventReuse: 5,
      },
      sessionPolicy: {
        maxDurationMs: 86400000, idleTimeoutMs: 3600000,
        maxConcurrentSessions: 5, requireReauthForSensitive: true,
      },
      networkPolicy: {
        allowedIpRanges: [], blockedIpRanges: [],
        requireVpn: false, allowedCountries: [],
      },
      encryptionPolicy: {
        atRestAlgorithm: 'aes-256-gcm', inTransitProtocol: 'TLSv1.3',
        keyRotationDays: 90, minimumKeyLength: 256,
      },
      metadata: {}, createdAt: now, updatedAt: now,
    };
    this.policies.set(orgId, policy);

    // Initialize encryption key
    this.keys.set(orgId, randomBytes(32));
    return policy;
  }

  getPolicy(orgId: string): SecurityPolicy | null { return this.policies.get(orgId) ?? null; }

  updatePolicy(orgId: string, updates: Partial<SecurityPolicy>): Result<SecurityPolicy> {
    const policy = this.policies.get(orgId);
    if (!policy) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Security policy not found', timestamp: new Date() } };
    const updated = { ...policy, ...updates, updatedAt: new Date() };
    this.policies.set(orgId, updated);
    return { success: true, data: updated };
  }

  validatePassword(orgId: string, password: string): { valid: boolean; violations: readonly string[] } {
    const policy = this.policies.get(orgId)?.passwordPolicy;
    if (!policy) return { valid: true, violations: [] };
    const violations: string[] = [];
    if (password.length < policy.minLength) violations.push(`Minimum length: ${policy.minLength}`);
    if (policy.requireUppercase && !/[A-Z]/.test(password)) violations.push('Must contain uppercase letter');
    if (policy.requireLowercase && !/[a-z]/.test(password)) violations.push('Must contain lowercase letter');
    if (policy.requireNumbers && !/[0-9]/.test(password)) violations.push('Must contain number');
    if (policy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) violations.push('Must contain special character');
    return { valid: violations.length === 0, violations };
  }

  encrypt(plaintext: string, orgId: string): { encrypted: string; iv: string; tag: string } {
    const key = this.keys.get(orgId) ?? randomBytes(32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { encrypted, iv: iv.toString('hex'), tag };
  }

  decrypt(encrypted: string, iv: string, tag: string, orgId: string): string {
    const key = this.keys.get(orgId);
    if (!key) throw new Error('No encryption key for organization');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  rotateKey(orgId: string): string {
    const newKey = randomBytes(32);
    this.keys.set(orgId, newKey);
    this.logger.info({ orgId }, 'Encryption key rotated');
    return newKey.toString('hex');
  }

  checkIpAllowed(orgId: string, ip: string): boolean {
    const policy = this.policies.get(orgId);
    if (!policy) return true;
    const { allowedIpRanges, blockedIpRanges } = policy.networkPolicy;
    if (blockedIpRanges.some((range) => ip.startsWith(range.split('/')[0] ?? ''))) return false;
    if (allowedIpRanges.length > 0) return allowedIpRanges.some((range) => ip.startsWith(range.split('/')[0] ?? ''));
    return true;
  }

  detectIntrusion(orgId: string, userId: string, ip: string, action: string): { threat: boolean; severity: 'low' | 'medium' | 'high'; reason: string } {
    const key = `${orgId}:${userId}:${ip}`;
    const attempts = this.failedAttempts.get(key);
    const now = new Date();

    if (attempts && now.getTime() - attempts.lastAttempt.getTime() < 300000 && attempts.count > 10) {
      return { threat: true, severity: 'high', reason: 'Brute force attempt detected' };
    }

    // Record attempt
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, { count: 1, lastAttempt: now });
    } else {
      const rec = this.failedAttempts.get(key)!;
      this.failedAttempts.set(key, { count: rec.count + 1, lastAttempt: now });
    }

    this.auditEvents.get(orgId)?.push({ timestamp: now, event: action, userId, ip, details: '' });

    return { threat: false, severity: 'low', reason: 'Normal activity' };
  }

  getAuditEvents(orgId: string, limit = 50): readonly { timestamp: Date; event: string; userId: string; ip: string; details: string }[] {
    return (this.auditEvents.get(orgId) ?? []).slice(-limit);
  }
}
