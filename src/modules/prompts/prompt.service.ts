/**
 * Prompt Storage Service
 */

import { BaseService } from '../../core/base-service.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Prompt, CreatePromptInput, UpdatePromptInput } from './prompt.types.js';
import { CreatePromptSchema, UpdatePromptSchema } from './prompt.types.js';
import type { IAuditService } from '../audit/audit.service.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IPromptService {
  getById(id: string): Promise<Result<Prompt>>;
  create(input: CreatePromptInput, actor: AuthenticatedUser): Promise<Result<Prompt>>;
  update(id: string, input: UpdatePromptInput, actor: AuthenticatedUser): Promise<Result<Prompt>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>>;
  listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>>;
  listPublic(pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>>;
  search(query: string, orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>>;
  incrementUsage(id: string): Promise<Result<void>>;
  fork(id: string, actor: AuthenticatedUser): Promise<Result<Prompt>>;
}

export class PromptService extends BaseService implements IPromptService {
  private readonly collection = 'prompts';

  constructor(
    private readonly firestore: IFirestoreClient, private readonly audit: IAuditService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async getById(id: string): Promise<Result<Prompt>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.success({ id, ...doc.data } as Prompt) : this.failure(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
  }

  async create(input: CreatePromptInput, actor: AuthenticatedUser): Promise<Result<Prompt>> {
    const parsed = CreatePromptSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const now = new Date();
    const prompt: Record<string, unknown> = { ...parsed.data, userId: actor.uid, version: 1, usageCount: 0, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, prompt);
    await this.audit.log({ action: 'prompt.created', actorId: actor.uid, targetId: id, targetType: 'Prompt', data: { name: parsed.data.name } });
    return this.success({ id, ...parsed.data, userId: actor.uid, version: 1, usageCount: 0, createdAt: now, updatedAt: now } as unknown as Prompt);
  }

  async update(id: string, input: UpdatePromptInput, actor: AuthenticatedUser): Promise<Result<Prompt>> {
    const parsed = UpdatePromptSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const existing = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!existing) return this.failure(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    const newVersion = ((existing.data['version'] as number) ?? 0) + 1;
    await this.firestore.updateDocument(this.collection, id, { ...parsed.data, version: newVersion, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return this.success({ id: updated!.id, ...updated!.data } as unknown as Prompt);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    await this.firestore.deleteDocument(this.collection, id);
    await this.audit.log({ action: 'prompt.deleted', actorId: actor.uid, targetId: id, targetType: 'Prompt', data: {} });
    return this.success(undefined);
  }

  async listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>> {
    return this.listPaginated([{ field: 'organizationId', operator: '==', value: orgId }], pagination);
  }

  async listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>> {
    return this.listPaginated([{ field: 'workspaceId', operator: '==', value: workspaceId }], pagination);
  }

  async listPublic(pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>> {
    return this.listPaginated([{ field: 'isPublic', operator: '==', value: true }], pagination);
  }

  async search(query: string, orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>> {
    // In production, use Algolia/Typesense; here filter in-memory for demonstration
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'organizationId', operator: '==', value: orgId }], { limit: 1000 });
    const filtered = all.filter((d) => {
      const name = (d.data['name'] as string) ?? '';
      const content = (d.data['content'] as string) ?? '';
      const q = query.toLowerCase();
      return name.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    }).map((d) => ({ id: d.id, ...d.data } as Prompt));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(filtered.slice(start, start + pagination.limit), filtered.length, pagination));
  }

  async incrementUsage(id: string): Promise<Result<void>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return this.failure(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    await this.firestore.updateDocument(this.collection, id, { usageCount: ((doc.data['usageCount'] as number) ?? 0) + 1, updatedAt: new Date() });
    return this.success(undefined);
  }

  async fork(id: string, actor: AuthenticatedUser): Promise<Result<Prompt>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return this.failure(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    const original = doc.data;
    const forkId = crypto.randomUUID();
    const now = new Date();
    const forked: Record<string, unknown> = { ...original, userId: actor.uid, version: 1, usageCount: 0, name: `${original['name']} (fork)`, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, forkId, forked);
    return this.success({ id: forkId, ...forked } as unknown as Prompt);
  }

  private async listPaginated(filters: { field: string; operator: '==' | '!='; value: unknown }[], pagination: PaginationParams): Promise<Result<PaginatedResponse<Prompt>>> {
    const all = await this.firestore.getCollection<Record<string, unknown>>(this.collection, filters,
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const mapped = all.map((d) => ({ id: d.id, ...d.data } as Prompt));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(mapped.slice(start, start + pagination.limit), mapped.length, pagination));
  }
}
