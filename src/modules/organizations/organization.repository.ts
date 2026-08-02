/**
 * Organization Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { Organization, OrganizationMember } from './organization.types.js';
import {
  BaseRepository,
  type FindOptions,
  type QueryFilter,
} from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class OrganizationRepository extends BaseRepository<Organization> {
  private readonly collection = 'organizations';
  private readonly membersCollection = 'organization_members';

  constructor(
    private readonly firestore: IFirestoreClient,
    private readonly logger: ILogger,
  ) {
    super();
  }

  async findById(id: string): Promise<Organization | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return null;
    return this.mapToEntity(doc.id, doc.data);
  }

  async findByIds(ids: readonly string[]): Promise<readonly Organization[]> {
    const orgs: Organization[] = [];
    for (const id of ids) {
      const org = await this.findById(id);
      if (org) orgs.push(org);
    }
    return orgs;
  }

  async findAll(options?: FindOptions): Promise<readonly Organization[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(
      this.collection,
      [],
      {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: options?.orderBy
          ? [{ field: options.orderBy, direction: options.orderDirection ?? 'asc' }]
          : [{ field: 'createdAt', direction: 'desc' }],
      },
    );
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findWhere(
    filters: readonly QueryFilter[],
    options?: FindOptions,
  ): Promise<readonly Organization[]> {
    const fsFilters = filters.map((f) => ({
      field: f.field,
      operator: f.operator as any,
      value: f.value,
    }));
    const docs = await this.firestore.getCollection<Record<string, unknown>>(
      this.collection,
      fsFilters,
      {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: options?.orderBy
          ? [{ field: options.orderBy, direction: options.orderDirection ?? 'asc' }]
          : [{ field: 'createdAt', direction: 'desc' }],
      },
    );
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findPaginated(
    filters: readonly QueryFilter[],
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<Organization>> {
    const all = await this.findWhere(filters, {
      limit: pagination.limit * pagination.page,
      orderBy: pagination.sortBy ?? 'createdAt',
      orderDirection: pagination.sortOrder ?? 'desc',
    });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(
    entity: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<Organization> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data);
    return this.mapToEntity(id, data);
  }

  async update(
    id: string,
    data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Organization> {
    const updateData = { ...data, updatedAt: new Date() };
    await this.firestore.updateDocument(this.collection, id, updateData as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Organization ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.firestore.updateDocument(this.collection, id, {
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async count(filters?: readonly QueryFilter[]): Promise<number> {
    const results = filters ? await this.findWhere(filters) : await this.findAll();
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.firestore.getDocument(this.collection, id)) !== null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const results = await this.findWhere([{ field: 'slug', operator: '==', value: slug }]);
    return results[0] ?? null;
  }

  async addMember(orgId: string, userId: string, role: string): Promise<OrganizationMember> {
    const id = `${orgId}_${userId}`;
    const now = new Date();
    const data: Record<string, unknown> = {
      organizationId: orgId,
      userId,
      role,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.firestore.createDocument(this.membersCollection, id, data);
    return { id, organizationId: orgId, userId, role, joinedAt: now, createdAt: now, updatedAt: now };
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.firestore.deleteDocument(this.membersCollection, `${orgId}_${userId}`);
  }

  async getMember(orgId: string, userId: string): Promise<OrganizationMember | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(
      this.membersCollection,
      `${orgId}_${userId}`,
    );
    if (!doc) return null;
    return {
      id: doc.id,
      organizationId: orgId,
      userId,
      role: (doc.data['role'] as string) ?? 'member',
      joinedAt: doc.data['joinedAt'] instanceof Date
        ? (doc.data['joinedAt'] as Date)
        : new Date(doc.data['joinedAt'] as string),
      createdAt: doc.data['createdAt'] instanceof Date
        ? (doc.data['createdAt'] as Date)
        : new Date(doc.data['createdAt'] as string),
      updatedAt: doc.data['updatedAt'] instanceof Date
        ? (doc.data['updatedAt'] as Date)
        : new Date(doc.data['updatedAt'] as string),
    };
  }

  async listMembers(orgId: string): Promise<readonly OrganizationMember[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(
      this.membersCollection,
      [{ field: 'organizationId', operator: '==', value: orgId }],
    );
    return docs.map((d) => ({
      id: d.id,
      organizationId: orgId,
      userId: (d.data['userId'] as string) ?? '',
      role: (d.data['role'] as string) ?? 'member',
      joinedAt: d.data['joinedAt'] instanceof Date
        ? (d.data['joinedAt'] as Date)
        : new Date(d.data['joinedAt'] as string),
      createdAt: d.data['createdAt'] instanceof Date
        ? (d.data['createdAt'] as Date)
        : new Date(d.data['createdAt'] as string),
      updatedAt: d.data['updatedAt'] instanceof Date
        ? (d.data['updatedAt'] as Date)
        : new Date(d.data['updatedAt'] as string),
    }));
  }

  private mapToEntity(id: string, data: Record<string, unknown>): Organization {
    return {
      id,
      name: (data['name'] as string) ?? '',
      slug: (data['slug'] as string) ?? '',
      plan: (data['plan'] as string) ?? 'free',
      ownerId: (data['ownerId'] as string) ?? '',
      memberCount: (data['memberCount'] as number) ?? 0,
      status: (data['status'] as Organization['status']) ?? 'active',
      metadata: (data['metadata'] as Record<string, unknown>) ?? {},
      settings: (data['settings'] as Record<string, unknown>) ?? {},
      createdAt: data['createdAt'] instanceof Date
        ? (data['createdAt'] as Date)
        : new Date(data['createdAt'] as string),
      updatedAt: data['updatedAt'] instanceof Date
        ? (data['updatedAt'] as Date)
        : new Date(data['updatedAt'] as string),
    };
  }
}
