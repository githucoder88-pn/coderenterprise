/**
 * Audit Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { AuditLog } from './audit.types.js';
import { BaseRepository, type FindOptions, type QueryFilter } from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class AuditRepository extends BaseRepository<AuditLog> {
  private readonly collection = 'audit_logs';

  constructor(
    private readonly firestore: IFirestoreClient,
  ) {
    super();
  }

  async findById(id: string): Promise<AuditLog | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return null;
    return this.mapToEntity(doc.id, doc.data);
  }

  async findByIds(ids: readonly string[]): Promise<readonly AuditLog[]> {
    // ⚡ Bolt: Use Promise.all to fetch audit logs concurrently instead of sequential N+1 query
    const results = await Promise.all(ids.map((id) => this.findById(id)));
    return results.filter((log): log is AuditLog => log != null);
  }

  async findAll(options?: FindOptions): Promise<readonly AuditLog[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, [], {
      limit: options?.limit ?? 100,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly AuditLog[]> {
    const fsFilters = filters.map((f) => ({ field: f.field, operator: f.operator as any, value: f.value }));
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, fsFilters, {
      limit: options?.limit ?? 100,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findPaginated(
    filters: readonly QueryFilter[],
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<AuditLog>> {
    const all = await this.findWhere(filters, {
      limit: pagination.limit * pagination.page,
      orderBy: pagination.sortBy ?? 'createdAt',
      orderDirection: pagination.sortOrder ?? 'desc',
    });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(entity: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<AuditLog> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data);
    return this.mapToEntity(id, data);
  }

  async update(): Promise<AuditLog> {
    throw new Error('Audit logs are immutable');
  }

  async delete(): Promise<void> {
    throw new Error('Audit logs cannot be deleted');
  }

  async count(filters?: readonly QueryFilter[]): Promise<number> {
    const results = filters ? await this.findWhere(filters) : await this.findAll();
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.firestore.getDocument(this.collection, id)) !== null;
  }

  async findByActor(actorId: string, pagination: PaginationParams): Promise<PaginatedResponse<AuditLog>> {
    return this.findPaginated(
      [{ field: 'actorId', operator: '==', value: actorId }],
      pagination,
    );
  }

  async findByTarget(targetId: string, pagination: PaginationParams): Promise<PaginatedResponse<AuditLog>> {
    return this.findPaginated(
      [{ field: 'targetId', operator: '==', value: targetId }],
      pagination,
    );
  }

  async findByOrganization(orgId: string, pagination: PaginationParams): Promise<PaginatedResponse<AuditLog>> {
    return this.findPaginated(
      [{ field: 'organizationId', operator: '==', value: orgId }],
      pagination,
    );
  }

  private mapToEntity(id: string, data: Record<string, unknown>): AuditLog {
    return {
      id,
      action: (data['action'] as string) ?? '',
      actorId: (data['actorId'] as string) ?? '',
      targetId: (data['targetId'] as string) ?? '',
      targetType: (data['targetType'] as string) ?? '',
      data: (data['data'] as Record<string, unknown>) ?? {},
      ip: data['ip'] as string | undefined,
      userAgent: data['userAgent'] as string | undefined,
      organizationId: data['organizationId'] as string | undefined,
      createdAt: data['createdAt'] instanceof Date ? (data['createdAt'] as Date) : new Date(data['createdAt'] as string),
      updatedAt: data['updatedAt'] instanceof Date ? (data['updatedAt'] as Date) : new Date(data['updatedAt'] as string),
    };
  }
}
