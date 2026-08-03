/**
 * Workspace Service
 */

import { BaseService } from '../../core/base-service.js';
import type { WorkspaceRepository } from './workspace.repository.js';
import type { IAuditService } from '../audit/audit.service.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from './workspace.types.js';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from './workspace.types.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';

export interface IWorkspaceService {
  getById(id: string): Promise<Result<Workspace>>;
  getBySlug(slug: string): Promise<Result<Workspace>>;
  create(input: CreateWorkspaceInput, actor: AuthenticatedUser): Promise<Result<Workspace>>;
  update(id: string, input: UpdateWorkspaceInput, actor: AuthenticatedUser): Promise<Result<Workspace>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Workspace>>>;
  archive(id: string, actor: AuthenticatedUser): Promise<Result<Workspace>>;
}

export class WorkspaceService extends BaseService implements IWorkspaceService {
  constructor(
    private readonly repo: WorkspaceRepository, private readonly audit: IAuditService,
    logger: ILogger, eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async getById(id: string): Promise<Result<Workspace>> {
    const ws = await this.repo.findById(id);
    return ws ? this.success(ws) : this.failure(ErrorCode.NOT_FOUND, `Workspace ${id} not found`);
  }

  async getBySlug(slug: string): Promise<Result<Workspace>> {
    const ws = await this.repo.findBySlug(slug);
    return ws ? this.success(ws) : this.failure(ErrorCode.NOT_FOUND, `Workspace ${slug} not found`);
  }

  async create(input: CreateWorkspaceInput, actor: AuthenticatedUser): Promise<Result<Workspace>> {
    const parsed = CreateWorkspaceSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const existing = await this.repo.findBySlug(parsed.data.slug);
    if (existing) return this.failure(ErrorCode.CONFLICT, `Slug ${parsed.data.slug} already exists`);
    const ws = await this.repo.create({ ...parsed.data, description: parsed.data.description ?? '', status: 'active', memberCount: 1, settings: parsed.data.settings ?? {}, metadata: {} });
    await this.audit.log({ action: 'workspace.created', actorId: actor.uid, targetId: ws.id, targetType: 'Workspace', data: { name: ws.name } });
    return this.success(ws);
  }

  async update(id: string, input: UpdateWorkspaceInput, actor: AuthenticatedUser): Promise<Result<Workspace>> {
    const parsed = UpdateWorkspaceSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const ws = await this.repo.findById(id);
    if (!ws) return this.failure(ErrorCode.NOT_FOUND, `Workspace ${id} not found`);
    const updated = await this.repo.update(id, parsed.data);
    await this.audit.log({ action: 'workspace.updated', actorId: actor.uid, targetId: id, targetType: 'Workspace', data: { changes: parsed.data } });
    return this.success(updated);
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<Result<void>> {
    const ws = await this.repo.findById(id);
    if (!ws) return this.failure(ErrorCode.NOT_FOUND, `Workspace ${id} not found`);
    await this.repo.delete(id);
    await this.audit.log({ action: 'workspace.deleted', actorId: actor.uid, targetId: id, targetType: 'Workspace', data: {} });
    return this.success(undefined);
  }

  async listByOrganization(orgId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Workspace>>> {
    return this.success(await this.repo.findPaginated(
      [{ field: 'organizationId', operator: '==', value: orgId }, { field: 'status', operator: '!=', value: 'deleted' }], pagination,
    ));
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<Result<Workspace>> {
    const ws = await this.repo.findById(id);
    if (!ws) return this.failure(ErrorCode.NOT_FOUND, `Workspace ${id} not found`);
    const updated = await this.repo.update(id, { status: 'archived' });
    await this.audit.log({ action: 'workspace.archived', actorId: actor.uid, targetId: id, targetType: 'Workspace', data: {} });
    return this.success(updated);
  }
}
