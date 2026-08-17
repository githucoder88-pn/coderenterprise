/**
 * Model Registry Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { Model } from './model.types.js';
import { BaseRepository, type FindOptions, type QueryFilter } from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class ModelRepository extends BaseRepository<Model> {
  private readonly collection = 'models';

  constructor(private readonly firestore: IFirestoreClient) { super(); }

  async findById(id: string): Promise<Model | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.map(doc.id, doc.data) : null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Model[]> {
    // ⚡ Bolt: Use Promise.all to fetch documents concurrently instead of sequentially
    // This avoids the N+1 query latency problem for multi-ID queries.
    const results = await Promise.all(ids.map((id) => this.findById(id)));
    return results.filter((m): m is Model => m != null);
  }

  async findAll(options?: FindOptions): Promise<readonly Model[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, [],
      { limit: options?.limit, orderBy: [{ field: 'displayName', direction: 'asc' }] });
    return docs.map((d) => this.map(d.id, d.data));
  }

  async findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly Model[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      filters.map((f) => ({ field: f.field, operator: f.operator as any, value: f.value })),
      { limit: options?.limit, orderBy: [{ field: 'displayName', direction: 'asc' }] });
    return docs.map((d) => this.map(d.id, d.data));
  }

  async findPaginated(filters: readonly QueryFilter[], pagination: PaginationParams): Promise<PaginatedResponse<Model>> {
    const all = await this.findWhere(filters, { limit: pagination.limit * pagination.page });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(entity: Omit<Model, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Model> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data as Record<string, unknown>);
    return this.map(id, data as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Omit<Model, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Model> {
    await this.firestore.updateDocument(this.collection, id, { ...data, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Model ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> { await this.firestore.deleteDocument(this.collection, id); }
  async count(filters?: readonly QueryFilter[]): Promise<number> { return (await (filters ? this.findWhere(filters) : this.findAll())).length; }
  async exists(id: string): Promise<boolean> { return (await this.firestore.getDocument(this.collection, id)) !== null; }

  async findByModelId(modelId: string): Promise<Model | null> {
    const results = await this.findWhere([{ field: 'modelId', operator: '==', value: modelId }]);
    return results[0] ?? null;
  }

  async findByProvider(provider: string): Promise<readonly Model[]> {
    return this.findWhere([{ field: 'provider', operator: '==', value: provider }]);
  }

  async findActive(): Promise<readonly Model[]> {
    return this.findWhere([{ field: 'status', operator: '==', value: 'active' }]);
  }

  async findByCapability(capability: string): Promise<readonly Model[]> {
    return this.findWhere([{ field: `capabilities.${capability}`, operator: '==', value: true }]);
  }

  private map(id: string, d: Record<string, unknown>): Model {
    return {
      id, modelId: (d['modelId'] as string) ?? '', provider: (d['provider'] as string) ?? '',
      displayName: (d['displayName'] as string) ?? '', description: (d['description'] as string) ?? '',
      capabilities: (d['capabilities'] as Model['capabilities']) ?? {
        streaming: false, toolCalling: false, vision: false, embeddings: false,
        imageGeneration: false, reasoning: false, structuredOutput: false,
      },
      contextWindow: (d['contextWindow'] as number) ?? 4096, maxOutputTokens: (d['maxOutputTokens'] as number) ?? 4096,
      pricing: (d['pricing'] as Model['pricing']) ?? null, tags: (d['tags'] as string[]) ?? [],
      deprecated: (d['deprecated'] as boolean) ?? false, status: (d['status'] as Model['status']) ?? 'active',
      metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }
}
