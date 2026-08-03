/**
 * Encryption Service
 *
 * AES-256-GCM encryption at rest, key rotation, secure key derivation.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash, timingSafeEqual } from 'node:crypto';
import type { ILogger } from '../../telemetry/logger.js';

interface EncryptionResult {
  readonly encrypted: string;
  readonly iv: string;
  readonly tag: string;
  readonly keyVersion: number;
}

interface KeyVersion {
  readonly version: number;
  readonly key: Buffer;
  readonly createdAt: Date;
  readonly active: boolean;
}

export class EncryptionService {
  private readonly keys: Map<number, KeyVersion> = new Map();
  private currentVersion = 1;

  constructor(
    masterKey: string,
    private readonly logger: ILogger,
  ) {
    // Derive initial key
    const key = scryptSync(masterKey, 'coderenterprise-v1', 32);
    this.keys.set(1, { version: 1, key, createdAt: new Date(), active: true });
  }

  encrypt(plaintext: string): EncryptionResult {
    const keyEntry = this.keys.get(this.currentVersion)!;
    const key = keyEntry.key;
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag,
      keyVersion: this.currentVersion,
    };
  }

  decrypt(data: EncryptionResult): string {
    const keyEntry = this.keys.get(data.keyVersion);
    if (!keyEntry) throw new Error(`Key version ${data.keyVersion} not found`);
    const key = keyEntry.key;

    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  rotateKey(): number {
    this.currentVersion++;
    const newKey = randomBytes(32);
    this.keys.set(this.currentVersion, { version: this.currentVersion, key: newKey, createdAt: new Date(), active: true });
    this.logger.info({ version: this.currentVersion }, 'Encryption key rotated');
    return this.currentVersion;
  }

  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  hashWithSalt(plaintext: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt ?? randomBytes(16).toString('hex');
    const hash = scryptSync(plaintext, actualSalt, 64).toString('hex');
    return { hash, salt: actualSalt };
  }

  verifyHash(plaintext: string, hash: string, salt: string): boolean {
    const { hash: computed } = this.hashWithSalt(plaintext, salt);
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  }

  generateSecureToken(length = 32): string {
    return randomBytes(length).toString('base64url');
  }

  maskSensitive(value: string, visibleChars = 4): string {
    if (value.length <= visibleChars) return '*'.repeat(value.length);
    return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars);
  }

  getCurrentKeyVersion(): number {
    return this.currentVersion;
  }
}
