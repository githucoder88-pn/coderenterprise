/**
 * Secrets Service
 *
 * Encrypted secret storage per organization.
 * Uses AES-256-GCM for encryption at rest.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import { ErrorCode, type Result } from '../../types/index.js';

interface EncryptedSecret {
  readonly id: string;
  readonly name: string;
  readonly encryptedValue: string;
  readonly iv: string;
  readonly tag: string;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Secret {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SetSecretInput {
  readonly name: string;
  readonly value: string;
  readonly organizationId: string;
}

export interface ISecretsService {
  set(input: SetSecretInput): Promise<Result<Secret>>;
  get(name: string, organizationId: string): Promise<Result<Secret>>;
  list(organizationId: string): Promise<Result<readonly { id: string; name: string; createdAt: Date; updatedAt: Date }[]>>;
  delete(name: string, organizationId: string): Promise<Result<void>>;
}

export class SecretsService extends BaseService implements ISecretsService {
  private readonly collection = 'secrets';
  private readonly key: Buffer;

  constructor(
    private readonly firestore: IFirestoreClient,
    private readonly cache: ICacheService,
    encryptionKey: string,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
    // Derive a 32-byte key from the config key
    this.key = scryptSync(encryptionKey, 'coderenterprise-salt', 32);
  }

  async set(input: SetSecretInput): Promise<Result<Secret>> {
    if (!input.name || !input.value) {
      return this.failure(ErrorCode.VALIDATION, 'Secret name and value are required');
    }

    const id = `${input.organizationId}:${input.name}`;
    const { encrypted, iv, tag } = this.encrypt(input.value);
    const now = new Date();

    const data: Record<string, unknown> = {
      name: input.name,
      encryptedValue: encrypted,
      iv,
      tag,
      organizationId: input.organizationId,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore.createDocument(this.collection, id, data);

    // Invalidate cache
    await this.cache.del(`secrets:${input.organizationId}:${input.name}`);

    this.logger.info({ name: input.name, organizationId: input.organizationId }, 'Secret stored');

    return this.success({
      id,
      name: input.name,
      value: input.value,
      organizationId: input.organizationId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async get(name: string, organizationId: string): Promise<Result<Secret>> {
    const id = `${organizationId}:${name}`;

    // Check cache first
    const cached = await this.cache.get<Secret>(`secrets:${organizationId}:${name}`);
    if (cached) return this.success(cached);

    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) {
      return this.failure(ErrorCode.NOT_FOUND, `Secret '${name}' not found`);
    }

    const decrypted = this.decrypt(
      doc.data['encryptedValue'] as string,
      doc.data['iv'] as string,
      doc.data['tag'] as string,
    );

    const secret: Secret = {
      id,
      name,
      value: decrypted,
      organizationId,
      createdAt: doc.data['createdAt'] instanceof Date
        ? (doc.data['createdAt'] as Date)
        : new Date(doc.data['createdAt'] as string),
      updatedAt: doc.data['updatedAt'] instanceof Date
        ? (doc.data['updatedAt'] as Date)
        : new Date(doc.data['updatedAt'] as string),
    };

    // Cache for 5 minutes
    await this.cache.set(`secrets:${organizationId}:${name}`, secret, 300);

    return this.success(secret);
  }

  async list(organizationId: string): Promise<Result<readonly { id: string; name: string; createdAt: Date; updatedAt: Date }[]>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(
      this.collection,
      [{ field: 'organizationId', operator: '==', value: organizationId }],
    );

    return this.success(
      docs.map((d) => ({
        id: d.id,
        name: (d.data['name'] as string) ?? '',
        createdAt: d.data['createdAt'] instanceof Date
          ? (d.data['createdAt'] as Date)
          : new Date(d.data['createdAt'] as string),
        updatedAt: d.data['updatedAt'] instanceof Date
          ? (d.data['updatedAt'] as Date)
          : new Date(d.data['updatedAt'] as string),
      })),
    );
  }

  async delete(name: string, organizationId: string): Promise<Result<void>> {
    const id = `${organizationId}:${name}`;
    const exists = await this.firestore.getDocument(this.collection, id);
    if (!exists) {
      return this.failure(ErrorCode.NOT_FOUND, `Secret '${name}' not found`);
    }

    await this.firestore.deleteDocument(this.collection, id);
    await this.cache.del(`secrets:${organizationId}:${name}`);

    this.logger.info({ name, organizationId }, 'Secret deleted');
    return this.success(undefined);
  }

  private encrypt(value: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag,
    };
  }

  private decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
