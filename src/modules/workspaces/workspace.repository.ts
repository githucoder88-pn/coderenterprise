/**
 * Workspace Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { Workspace } from './workspace.types.js';
import { BaseRepository, type FindOptions, type QueryFilter } from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class WorkspaceRepository extends BaseRepository<Workspace> {
  private readonly collection = 'workspaces';

  constructor(private readonly firestore: IFirestoreClient) { super(); }

  async findById(id: string): Promise<Workspace | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.map(doc.id, doc.data) : null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Workspace[]> {
    // ⚡ Bolt: Use Promise.all for concurrent document fetching to prevent N+1 query latency
    const results = await Promise.all(ids.map(id => this.findById(id)));
    return results.filter((ws): ws is NonNullable<typeof ws> => ws != null);
  }

  async findAll(options?: FindOptions): Promise<readonly Workspace[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, [], {
      limit: options?.limit, orderBy: [{ field: 'createdAt', direction: 'desc' }],
    });
    return docs.map((d) => this.map(d.id, d.data));
  }

  async findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly Workspace[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      filters.map((f) => ({ field: f.field, operator: f.operator as any, value: f.value })),
      { limit: options?.limit, orderBy: [{ field: 'createdAt', direction: 'desc' }] },
    );
    return docs.map((d) => this.map(d.id, d.data));
  }

  async findPaginated(filters: readonly QueryFilter[], pagination: PaginationParams): Promise<PaginatedResponse<Workspace>> {
    const all = await this.findWhere(filters, { limit: pagination.limit * pagination.page });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(entity: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Workspace> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data as Record<string, unknown>);
    return this.map(id, data as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Workspace> {
    await this.firestore.updateDocument(this.collection, id, { ...data, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Workspace ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.firestore.updateDocument(this.collection, id, { status: 'deleted', updatedAt: new Date() });
  }

  async count(filters?: readonly QueryFilter[]): Promise<number> { return (await (filters ? this.findWhere(filters) : this.findAll())).length; }
  async exists(id: string): Promise<boolean> { return (await this.firestore.getDocument(this.collection, id)) !== null; }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const results = await this.findWhere([{ field: 'slug', operator: '==', value: slug }]);
    return results[0] ?? null;
  }

  async findByOrganization(orgId: string): Promise<readonly Workspace[]> {
    return this.findWhere([
      { field: 'organizationId', operator: '==', value: orgId },
      { field: 'status', operator: '!=', value: 'deleted' },
    ]);
  }

  private map(id: string, d: Record<string, unknown>): Workspace {
    return {
      id, name: (d['name'] as string) ?? '', slug: (d['slug'] as string) ?? '',
      organizationId: (d['organizationId'] as string) ?? '', description: (d['description'] as string) ?? '',
      status: (d['status'] as Workspace['status']) ?? 'active', memberCount: (d['memberCount'] as number) ?? 0,
      settings: (d['settings'] as Record<string, unknown>) ?? {}, metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }
}
