/**
 * User Repository
 *
 * Firestore-backed user persistence.
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { User } from './user.types.js';
import {
  BaseRepository,
  type FindOptions,
  type QueryFilter,
} from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class UserRepository extends BaseRepository<User> {
  private readonly collection = 'users';

  constructor(
    private readonly firestore: IFirestoreClient,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(
      this.collection,
      id,
    );
    if (!doc) return null;
    return this.mapToEntity(doc.id, doc.data);
  }

  async findByIds(ids: readonly string[]): Promise<readonly User[]> {
    // ⚡ Bolt Performance Optimization:
    // Replaced sequential `for...of` fetches with concurrent `Promise.all` mapping to eliminate N+1 query latency for bulk lookups.
    const results = await Promise.all(ids.map(id => this.findById(id)));
    return results.filter((item): item is User => item != null);
  }

  async findAll(options?: FindOptions): Promise<readonly User[]> {
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
  ): Promise<readonly User[]> {
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
  ): Promise<PaginatedResponse<User>> {
    const all = await this.findWhere(filters, {
      limit: pagination.limit * pagination.page,
      orderBy: pagination.sortBy ?? 'createdAt',
      orderDirection: pagination.sortOrder ?? 'desc',
    });

    const start = (pagination.page - 1) * pagination.limit;
    const pageData = all.slice(start, start + pagination.limit);

    return createPaginatedResponse(pageData, all.length, pagination);
  }

  async create(
    entity: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<User> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      ...entity,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore.createDocument(this.collection, id, data);
    return this.mapToEntity(id, data);
  }

  async update(
    id: string,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<User> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await this.firestore.updateDocument(this.collection, id, updateData as Record<string, unknown>);

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} not found after update`);
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
    const results = filters
      ? await this.findWhere(filters)
      : await this.findAll();
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.firestore.getDocument(this.collection, id);
    return doc !== null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.findWhere([
      { field: 'email', operator: '==', value: email },
    ]);
    return results[0] ?? null;
  }

  async findByOrganization(organizationId: string): Promise<readonly User[]> {
    return this.findWhere([
      { field: 'organizationId', operator: '==', value: organizationId },
      { field: 'status', operator: '!=', value: 'deleted' },
    ]);
  }

  private mapToEntity(id: string, data: Record<string, unknown>): User {
    return {
      id,
      email: (data['email'] as string) ?? '',
      displayName: (data['displayName'] as string) ?? '',
      photoURL: (data['photoURL'] as string) ?? null,
      organizationId: (data['organizationId'] as string) ?? '',
      role: (data['role'] as string) ?? 'member',
      status: (data['status'] as User['status']) ?? 'active',
      metadata: (data['metadata'] as Record<string, unknown>) ?? {},
      lastLoginAt: data['lastLoginAt'] instanceof Date
        ? (data['lastLoginAt'] as Date)
        : data['lastLoginAt']
          ? new Date(data['lastLoginAt'] as string)
          : null,
      emailVerified: (data['emailVerified'] as boolean) ?? false,
      createdAt: data['createdAt'] instanceof Date
        ? (data['createdAt'] as Date)
        : new Date(data['createdAt'] as string),
      updatedAt: data['updatedAt'] instanceof Date
        ? (data['updatedAt'] as Date)
        : new Date(data['updatedAt'] as string),
    };
  }
}
