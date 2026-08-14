/**
 * API Key Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { ApiKey } from './apikey.types.js';
import {
  BaseRepository,
  type FindOptions,
  type QueryFilter,
} from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class ApiKeyRepository extends BaseRepository<ApiKey> {
  private readonly collection = 'api_keys';

  constructor(
    private readonly firestore: IFirestoreClient,
  ) {
    super();
  }

  async findById(id: string): Promise<ApiKey | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    if (!doc) return null;
    return this.mapToEntity(doc.id, doc.data);
  }

  async findByIds(ids: readonly string[]): Promise<readonly ApiKey[]> {
    // ⚡ Bolt: Use Promise.all to fetch documents concurrently and prevent N+1 query latency
    const results = await Promise.all(ids.map(id => this.findById(id)));
    return results.filter((result): result is ApiKey => result != null);
  }

  async findAll(options?: FindOptions): Promise<readonly ApiKey[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, [], {
      limit: options?.limit,
      offset: options?.offset,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly ApiKey[]> {
    const fsFilters = filters.map((f) => ({ field: f.field, operator: f.operator as any, value: f.value }));
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, fsFilters, {
      limit: options?.limit,
      offset: options?.offset,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
    return docs.map((d) => this.mapToEntity(d.id, d.data));
  }

  async findPaginated(
    filters: readonly QueryFilter[],
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ApiKey>> {
    const all = await this.findWhere(filters, {
      limit: pagination.limit * pagination.page,
      orderBy: pagination.sortBy ?? 'createdAt',
      orderDirection: pagination.sortOrder ?? 'desc',
    });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(entity: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ApiKey> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data);
    return this.mapToEntity(id, data);
  }

  async update(id: string, data: Partial<Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiKey> {
    await this.firestore.updateDocument(this.collection, id, { ...data, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`ApiKey ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.firestore.updateDocument(this.collection, id, { status: 'revoked', deletedAt: new Date(), updatedAt: new Date() });
  }

  async count(filters?: readonly QueryFilter[]): Promise<number> {
    const results = filters ? await this.findWhere(filters) : await this.findAll();
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.firestore.getDocument(this.collection, id)) !== null;
  }

  async findByHashedKey(hashedKey: string): Promise<ApiKey | null> {
    const results = await this.findWhere([{ field: 'hashedKey', operator: '==', value: hashedKey }]);
    return results[0] ?? null;
  }

  async findByOrganization(orgId: string): Promise<readonly ApiKey[]> {
    return this.findWhere([
      { field: 'organizationId', operator: '==', value: orgId },
      { field: 'status', operator: '==', value: 'active' },
    ]);
  }

  private mapToEntity(id: string, data: Record<string, unknown>): ApiKey {
    return {
      id,
      name: (data['name'] as string) ?? '',
      keyPrefix: (data['keyPrefix'] as string) ?? '',
      hashedKey: (data['hashedKey'] as string) ?? '',
      organizationId: (data['organizationId'] as string) ?? '',
      userId: (data['userId'] as string) ?? '',
      permissions: (data['permissions'] as string[]) ?? [],
      status: (data['status'] as ApiKey['status']) ?? 'active',
      lastUsedAt: data['lastUsedAt'] instanceof Date
        ? (data['lastUsedAt'] as Date)
        : data['lastUsedAt'] ? new Date(data['lastUsedAt'] as string) : null,
      expiresAt: data['expiresAt'] instanceof Date
        ? (data['expiresAt'] as Date)
        : data['expiresAt'] ? new Date(data['expiresAt'] as string) : null,
      rateLimit: (data['rateLimit'] as number) ?? null,
      metadata: (data['metadata'] as Record<string, unknown>) ?? {},
      createdAt: data['createdAt'] instanceof Date ? (data['createdAt'] as Date) : new Date(data['createdAt'] as string),
      updatedAt: data['updatedAt'] instanceof Date ? (data['updatedAt'] as Date) : new Date(data['updatedAt'] as string),
    };
  }
}
