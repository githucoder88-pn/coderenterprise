import { describe, it, expect, vi } from 'vitest';
import { EncryptionService } from '../../../services/security/encryption.js';
import type { ILogger } from '../../../telemetry/logger.js';

describe('EncryptionService', () => {
  const logger: ILogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
  const service = new EncryptionService('test-master-key', logger);

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt string values', () => {
      const plaintext = 'sensitive-data';
      const enc = service.encrypt(plaintext);
      expect(enc.encrypted).not.toEqual(plaintext);
      expect(service.decrypt(enc)).toEqual(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const p = 'hello';
      const e1 = service.encrypt(p);
      const e2 = service.encrypt(p);
      expect(e1.iv).not.toEqual(e2.iv);
      expect(e1.encrypted).not.toEqual(e2.encrypted);
    });

    it('should throw if decryption key version is missing', () => {
      const enc = service.encrypt('test');
      const badEnc = { ...enc, keyVersion: 999 };
      expect(() => service.decrypt(badEnc)).toThrow(/not found/);
    });
  });

  describe('key rotation', () => {
    it('should rotate keys and maintain decryption capability for old data', () => {
      const plaintext = 'secret';
      const encV1 = service.encrypt(plaintext);
      expect(encV1.keyVersion).toBe(1);

      service.rotateKey();
      const encV2 = service.encrypt(plaintext);
      expect(encV2.keyVersion).toBe(2);

      expect(service.decrypt(encV1)).toEqual(plaintext);
      expect(service.decrypt(encV2)).toEqual(plaintext);
    });
  });

  describe('hashing', () => {
    it('should generate sha256 hash', () => {
      const h1 = service.hash('test');
      const h2 = service.hash('test');
      expect(h1).toEqual(h2);
    });

    it('should hash with salt', () => {
      const { hash: h1, salt: s1 } = service.hashWithSalt('pass');
      const { hash: h2, salt: s2 } = service.hashWithSalt('pass');
      expect(s1).not.toEqual(s2);
      expect(h1).not.toEqual(h2);

      const { hash: h3 } = service.hashWithSalt('pass', s1);
      expect(h1).toEqual(h3);
    });
  });

  describe('verifyHash', () => {
    it('should verify correct hashes', () => {
      const { hash, salt } = service.hashWithSalt('password123');
      expect(service.verifyHash('password123', hash, salt)).toBe(true);
    });

    it('should reject invalid hashes', () => {
      const { hash, salt } = service.hashWithSalt('password123');
      expect(service.verifyHash('wrongpassword', hash, salt)).toBe(false);
    });
  });
});

describe('Sentinel Security Regressions', () => {
  it('should safely reject incorrect length hashes without throwing (DoS prevention)', () => {
    const logger: ILogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const service = new EncryptionService('masterkey', logger);
    const { hash, salt } = service.hashWithSalt('password123');
    // timingSafeEqual normally throws if buffer lengths mismatch
    const shortHash = hash.slice(0, 16);
    expect(() => service.verifyHash('password123', shortHash, salt)).not.toThrow();
    expect(service.verifyHash('password123', shortHash, salt)).toBe(false);
  });
});
