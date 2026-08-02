/**
 * API Key Service
 */

import { createHash, randomBytes } from 'node:crypto';
import { BaseService } from '../../core/base-service.js';
import type { ApiKeyRepository } from './apikey.repository.js';
import type { IRBACService } from '../rbac/rbac.service.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResult } from './apikey.types.js';
import { CreateApiKeySchema } from './apikey.types.js';
import {
  DomainEvent,
  ErrorCode,
  type Result,
  type PaginationParams,
  type PaginatedResponse,
  type AuthenticatedUser,
} from '../../types/index.js';

export interface IApiKeyService {
  create(input: CreateApiKeyInput, actor: AuthenticatedUser): Promise<Result<CreateApiKeyResult>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<ApiKey>>>;
  revoke(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  validateKey(rawKey: string): Promise<Result<AuthenticatedUser>>;
}

export class ApiKeyService extends BaseService implements IApiKeyService {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly rbac: IRBACService,
    private readonly audit: IAuditService,
    logger: ILogger,
    eventBus: IEventBus,
  ) {
    super(logger, eventBus);
  }

  async create(
    input: CreateApiKeyInput,
    actor: AuthenticatedUser,
  ): Promise<Result<CreateApiKeyResult>> {
    const parsed = CreateApiKeySchema.safeParse(input);
    if (!parsed.success) {
      return this.failure(ErrorCode.VALIDATION, 'Invalid API key input', { errors: parsed.error.flatten() });
    }

    const rawKey = `ce_${randomBytes(32).toString('base64url')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const hashedKey = this.hashKey(rawKey);

    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
      : null;

    const apiKey = await this.apiKeyRepo.create({
      name: parsed.data.name,
      keyPrefix,
      hashedKey,
      organizationId: parsed.data.organizationId,
      userId: actor.uid,
      permissions: parsed.data.permissions,
      status: 'active',
      lastUsedAt: null,
      expiresAt,
      rateLimit: parsed.data.rateLimit ?? null,
      metadata: parsed.data.metadata ?? {},
    });

    await this.emitEvent(DomainEvent.APIKEY_CREATED, apiKey.id, 'ApiKey', {
      name: apiKey.name,
      organizationId: apiKey.organizationId,
    });
    await this.audit.log({
      action: 'apikey.created',
      actorId: actor.uid,
      targetId: apiKey.id,
      targetType: 'ApiKey',
      data: { name: apiKey.name },
    });

    return this.success({ apiKey, rawKey });
  }

  async listByOrganization(
    orgId: string,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResponse<ApiKey>>> {
    const result = await this.apiKeyRepo.findPaginated(
      [
        { field: 'organizationId', operator: '==', value: orgId },
        { field: 'status', operator: '==', value: 'active' },
      ],
      pagination,
    );
    return this.success(result);
  }

  async revoke(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    const apiKey = await this.apiKeyRepo.findById(id);
    if (!apiKey) return this.failure(ErrorCode.NOT_FOUND, `API key ${id} not found`);

    await this.apiKeyRepo.update(id, { status: 'revoked' });

    await this.emitEvent(DomainEvent.APIKEY_REVOKED, id, 'ApiKey', {});
    await this.audit.log({
      action: 'apikey.revoked',
      actorId: actor.uid,
      targetId: id,
      targetType: 'ApiKey',
      data: {},
    });

    return this.success(undefined);
  }

  async validateKey(rawKey: string): Promise<Result<AuthenticatedUser>> {
    const hashedKey = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepo.findByHashedKey(hashedKey);

    if (!apiKey) {
      return this.failure(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid API key');
    }

    if (apiKey.status === 'revoked') {
      return this.failure(ErrorCode.AUTH_TOKEN_INVALID, 'API key has been revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return this.failure(ErrorCode.AUTH_TOKEN_EXPIRED, 'API key has expired');
    }

    // Update last used timestamp
    await this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });

    return this.success({
      uid: apiKey.userId,
      email: '',
      organizationId: apiKey.organizationId,
      role: 'service',
      permissions: apiKey.permissions,
    });
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
