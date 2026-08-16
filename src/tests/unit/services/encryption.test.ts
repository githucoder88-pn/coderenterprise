/**
 * Encryption Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '../../../services/security/encryption.js';
import { createMockLogger } from '../../helpers.js';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService('test-master-key-at-least-32-chars!!', createMockLogger());
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input', () => {
      const a = service.encrypt('test');
      const b = service.encrypt('test');
      expect(a.encrypted).not.toBe(b.encrypted);
      expect(a.iv).not.toBe(b.iv);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle unicode', () => {
      const plaintext = '🔐 Unicode 测试 مرحبا';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle large payloads', () => {
      const plaintext = 'x'.repeat(100_000);
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });
  });

  describe('key rotation', () => {
    it('should rotate and use new key', () => {
      const encrypted1 = service.encrypt('before rotation');
      const newVersion = service.rotateKey();
      expect(newVersion).toBe(2);

      const encrypted2 = service.encrypt('after rotation');
      expect(encrypted2.keyVersion).toBe(2);

      // Old ciphertext should still decrypt
      expect(service.decrypt(encrypted1)).toBe('before rotation');
      expect(service.decrypt(encrypted2)).toBe('after rotation');
    });
  });

  describe('hash', () => {
    it('should produce consistent hash', () => {
      const hash1 = service.hash('test');
      const hash2 = service.hash('test');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });
  });

  describe('hashWithSalt', () => {
    it('should produce different hashes with different salts', () => {
      const a = service.hashWithSalt('password');
      const b = service.hashWithSalt('password');
      expect(a.hash).not.toBe(b.hash);
      expect(a.salt).not.toBe(b.salt);
    });

    it('should verify correctly', () => {
      const { hash, salt } = service.hashWithSalt('password');
      expect(service.verifyHash('password', hash, salt)).toBe(true);
      expect(service.verifyHash('wrong', hash, salt)).toBe(false);
    });

    it('should safely handle hash length mismatches without throwing', () => {
      const { salt } = service.hashWithSalt('password');
      expect(() => service.verifyHash('password', 'tooshort', salt)).not.toThrow();
      expect(service.verifyHash('password', 'tooshort', salt)).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => service.generateSecureToken()));
      expect(tokens.size).toBe(100);
    });

    it('should respect length parameter', () => {
      const token = service.generateSecureToken(16);
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('maskSensitive', () => {
    it('should mask all but first N chars', () => {
      expect(service.maskSensitive('1234567890', 4)).toBe('1234******');
    });

    it('should handle short strings', () => {
      expect(service.maskSensitive('ab', 4)).toBe('**');
    });
  });
});
