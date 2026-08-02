/**
 * Team Service
 */

import { BaseService } from '../../core/base-service.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Team, CreateTeamInput, UpdateTeamInput } from './team.types.js';
import { CreateTeamSchema, UpdateTeamSchema } from './team.types.js';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface ITeamService {
  getById(id: string): Promise<Result<Team>>;
  create(input: CreateTeamInput, actor: AuthenticatedUser): Promise<Result<Team>>;
  update(id: string, input: UpdateTeamInput, actor: AuthenticatedUser): Promise<Result<Team>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Team>>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Team>>>;
}

export class TeamService extends BaseService implements ITeamService {
  private readonly collection = 'teams';

  constructor(
    private readonly firestore: IFirestoreClient, private readonly audit: IAuditService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async getById(id: string): Promise<Result<Team>> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.success(this.map(id, doc.data)) : this.failure(ErrorCode.NOT_FOUND, `Team ${id} not found`);
  }

  async create(input: CreateTeamInput, actor: AuthenticatedUser): Promise<Result<Team>> {
    const parsed = CreateTeamSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const id = crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = { ...parsed.data, status: 'active', memberCount: 1, metadata: parsed.data.metadata ?? {}, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data);
    await this.audit.log({ action: 'team.created', actorId: actor.uid, targetId: id, targetType: 'Team', data: { name: parsed.data.name } });
    return this.success(this.map(id, data));
  }

  async update(id: string, input: UpdateTeamInput, actor: AuthenticatedUser): Promise<Result<Team>> {
    const parsed = UpdateTeamSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const doc = await this.firestore.getDocument(this.collection, id);
    if (!doc) return this.failure(ErrorCode.NOT_FOUND, `Team ${id} not found`);
    await this.firestore.updateDocument(this.collection, id, { ...parsed.data, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    await this.audit.log({ action: 'team.updated', actorId: actor.uid, targetId: id, targetType: 'Team', data: { changes: parsed.data } });
    return this.success(this.map(id, updated!.data));
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    await this.firestore.updateDocument(this.collection, id, { status: 'deleted', updatedAt: new Date() });
    await this.audit.log({ action: 'team.deleted', actorId: actor.uid, targetId: id, targetType: 'Team', data: {} });
    return this.success(undefined);
  }

  async listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Team>>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'workspaceId', operator: '==', value: workspaceId }, { field: 'status', operator: '!=', value: 'deleted' }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const all = docs.map((d) => this.map(d.id, d.data));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination));
  }

  async listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Team>>> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'organizationId', operator: '==', value: orgId }, { field: 'status', operator: '!=', value: 'deleted' }],
      { limit: pagination.limit * pagination.page, orderBy: [{ field: 'createdAt', direction: 'desc' }] });
    const all = docs.map((d) => this.map(d.id, d.data));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination));
  }

  private map(id: string, d: Record<string, unknown>): Team {
    return {
      id, name: (d['name'] as string) ?? '', organizationId: (d['organizationId'] as string) ?? '',
      workspaceId: (d['workspaceId'] as string) ?? '', description: (d['description'] as string) ?? '',
      status: (d['status'] as Team['status']) ?? 'active', memberCount: (d['memberCount'] as number) ?? 0,
      metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }
}
