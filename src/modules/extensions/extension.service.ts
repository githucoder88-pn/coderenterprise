/**
 * Extension Service
 */

import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Extension, CreateExtensionInput, UpdateExtensionInput } from './extension.types.js';
import { CreateExtensionSchema, UpdateExtensionSchema } from './extension.types.js';
import type { IAuditService } from '../audit/audit.service.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IExtensionService {
  getById(id: string): Promise<Result<Extension>>;
  getBySlug(slug: string): Promise<Result<Extension>>;
  create(input: CreateExtensionInput, actor: AuthenticatedUser): Promise<Result<Extension>>;
  update(id: string, input: UpdateExtensionInput, actor: AuthenticatedUser): Promise<Result<Extension>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Extension>>>;
  activate(id: string, actor: AuthenticatedUser): Promise<Result<Extension>>;
  deactivate(id: string, actor: AuthenticatedUser): Promise<Result<Extension>>;
  install(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
}

export class ExtensionService extends BaseService implements IExtensionService {
  private readonly collection = 'extensions';

  constructor(
    private readonly firestore: IFirestoreClient, private readonly audit: IAuditService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async getById(id: string): Promise<Result<Extension>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.success({ id, ...doc.data } as Extension) : this.failure(ErrorCode.NOT_FOUND, `Extension ${id} not found`);
  }

  async getBySlug(slug: string): Promise<Result<Extension>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'slug', operator: '==', value: slug }], { limit: 1 });
    if (docs.length === 0) return this.failure(ErrorCode.NOT_FOUND, `Extension ${slug} not found`);
    return this.success({ id: docs[0]!.id, ...docs[0]!.data } as Extension);
  }

  async create(input: CreateExtensionInput, actor: AuthenticatedUser): Promise<Result<Extension>> {
    const parsed = CreateExtensionSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const now = new Date();
    const ext: Record<string, unknown> = { ...parsed.data, userId: actor.uid, status: 'active', installCount: 0, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, ext);
    await this.audit.log({ action: 'extension.created', actorId: actor.uid, targetId: id, targetType: 'Extension', data: { name: parsed.data.name } });
    return this.success({ id, ...ext } as unknown as Extension);
  }

  async update(id: string, input: UpdateExtensionInput, _actor: AuthenticatedUser): Promise<Result<Extension>> {
    const parsed = UpdateExtensionSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    await this.firestore.updateDocument(this.collection, id, { ...parsed.data, updatedAt: new Date() } as Record<string, unknown>);
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return this.success({ id: doc!.id, ...doc!.data } as unknown as Extension);
  }

  async delete(id: string, _actor: AuthenticatedUser): Promise<Result<void>> {
    await this.firestore.deleteDocument(this.collection, id);
    return this.success(undefined);
  }

  async listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Extension>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'organizationId', operator: '==', value: orgId }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d) => ({ id: d.id, ...d.data } as Extension));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }

  async activate(id: string, _actor: AuthenticatedUser): Promise<Result<Extension>> {
    await this.firestore.updateDocument(this.collection, id, { status: 'active', updatedAt: new Date() });
    return this.getById(id);
  }

  async deactivate(id: string, _actor: AuthenticatedUser): Promise<Result<Extension>> {
    await this.firestore.updateDocument(this.collection, id, { status: 'inactive', updatedAt: new Date() });
    return this.getById(id);
  }

  async install(id: string, _actor: AuthenticatedUser): Promise<Result<void>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return this.failure(ErrorCode.NOT_FOUND, `Extension ${id} not found`);
    await this.firestore.updateDocument(this.collection, id, { installCount: ((doc.data['installCount'] as number) ?? 0) + 1, updatedAt: new Date() });
    return this.success(undefined);
  }
}
