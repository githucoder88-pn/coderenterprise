/**
 * Security Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityManager } from '../../../enterprise/security/security-manager.js';
import { createMockLogger } from '../../helpers.js';
import type { IRedisClient } from '../../../infrastructure/redis/redis-client.js';

function createMockRedis(): IRedisClient {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => 1),
    exists: vi.fn(async () => false), expire: vi.fn(async () => {}), ttl: vi.fn(async () => -1),
    incr: vi.fn(async () => 1), decr: vi.fn(async () => 0), incrBy: vi.fn(async () => 1),
    hset: vi.fn(async () => {}), hget: vi.fn(async () => null), hgetall: vi.fn(async () => ({})),
    hdel: vi.fn(async () => 0), lpush: vi.fn(async () => 0), rpush: vi.fn(async () => 0),
    lrange: vi.fn(async () => []), lrem: vi.fn(async () => 0), llen: vi.fn(async () => 0),
    keys: vi.fn(async () => []), scan: vi.fn(async () => ['0', []]),
    pipeline: vi.fn(() => ({} as any)), healthCheck: vi.fn(async () => true),
    disconnect: vi.fn(async () => {}), getClient: vi.fn(() => ({} as any)),
  };
}

describe('SecurityManager', () => {
  let manager: SecurityManager;

  beforeEach(() => { manager = new SecurityManager(createMockRedis(), createMockLogger()); });

  describe('policy', () => {
    it('should create a security policy', () => {
      const policy = manager.createPolicy('org-1');
      expect(policy.encryptionPolicy.atRestAlgorithm).toBe('aes-256-gcm');
      expect(policy.passwordPolicy.minLength).toBe(12);
    });

    it('should update a policy', () => {
      manager.createPolicy('org-1');
      const result = manager.updatePolicy('org-1', { mfaRequired: true });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.mfaRequired).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      manager.createPolicy('org-1');
      const result = manager.validatePassword('org-1', 'Str0ng!Pass#2024');
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should reject weak passwords', () => {
      manager.createPolicy('org-1');
      const result = manager.validatePassword('org-1', 'weak');
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should check uppercase requirement', () => {
      manager.createPolicy('org-1');
      const result = manager.validatePassword('org-1', 'lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Must contain uppercase letter');
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt', () => {
      manager.createPolicy('org-1');
      const encrypted = manager.encrypt('secret data', 'org-1');
      const decrypted = manager.decrypt(encrypted.encrypted, encrypted.iv, encrypted.tag, 'org-1');
      expect(decrypted).toBe('secret data');
    });

    it('should produce different ciphertext each time', () => {
      manager.createPolicy('org-1');
      const a = manager.encrypt('same', 'org-1');
      const b = manager.encrypt('same', 'org-1');
      expect(a.encrypted).not.toBe(b.encrypted);
    });

    it('should rotate keys', () => {
      manager.createPolicy('org-1');
      const key = manager.rotateKey('org-1');
      expect(key).toBeDefined();
      expect(key.length).toBe(64); // 32 bytes hex
    });
  });

  describe('IP filtering', () => {
    it('should allow IPs by default', () => {
      manager.createPolicy('org-1');
      expect(manager.checkIpAllowed('org-1', '192.168.1.1')).toBe(true);
    });

    it('should block IPs in blocklist', () => {
      manager.createPolicy('org-1');
      manager.updatePolicy('org-1', {
        networkPolicy: { allowedIpRanges: [], blockedIpRanges: ['10.0.0'], requireVpn: false, allowedCountries: [] },
      });
      expect(manager.checkIpAllowed('org-1', '10.0.0.5')).toBe(false);
    });
  });

  describe('intrusion detection', () => {
    it('should detect brute force', () => {
      manager.createPolicy('org-1');
      for (let i = 0; i < 11; i++) {
        manager.detectIntrusion('org-1', 'u1', '1.2.3.4', 'login_failed');
      }
      const result = manager.detectIntrusion('org-1', 'u1', '1.2.3.4', 'login_failed');
      expect(result.threat).toBe(true);
      expect(result.severity).toBe('high');
    });
  });
});
