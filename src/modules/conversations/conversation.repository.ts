/**
 * Conversation Repository
 */

import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { Conversation, ConversationMessage } from './conversation.types.js';
import { BaseRepository, type FindOptions, type QueryFilter } from '../../core/base-repository.js';
import type { PaginationParams, PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export class ConversationRepository extends BaseRepository<Conversation> {
  private readonly collection = 'conversations';
  private readonly messagesCollection = 'conversation_messages';

  constructor(private readonly firestore: IFirestoreClient) { super(); }

  async findById(id: string): Promise<Conversation | null> {
    const doc = await this.firestore.getDocument<Record<string, unknown>>(this.collection, id);
    return doc ? this.mapConversation(doc.id, doc.data) : null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Conversation[]> {
    // ⚡ Bolt Performance Optimization:
    // Replaced sequential `for...of` fetches with concurrent `Promise.all` mapping to eliminate N+1 query latency for bulk lookups.
    const results = await Promise.all(ids.map(id => this.findById(id)));
    return results.filter((item): item is Conversation => item != null);
  }

  async findAll(options?: FindOptions): Promise<readonly Conversation[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection, [], {
      limit: options?.limit ?? 50, orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    });
    return docs.map((d) => this.mapConversation(d.id, d.data));
  }

  async findWhere(filters: readonly QueryFilter[], options?: FindOptions): Promise<readonly Conversation[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      filters.map((f) => ({ field: f.field, operator: f.operator as any, value: f.value })),
      { limit: options?.limit ?? 50, orderBy: [{ field: 'lastMessageAt', direction: 'desc' }] },
    );
    return docs.map((d) => this.mapConversation(d.id, d.data));
  }

  async findPaginated(filters: readonly QueryFilter[], pagination: PaginationParams): Promise<PaginatedResponse<Conversation>> {
    const all = await this.findWhere(filters, { limit: pagination.limit * pagination.page });
    const start = (pagination.page - 1) * pagination.limit;
    return createPaginatedResponse(all.slice(start, start + pagination.limit), all.length, pagination);
  }

  async create(entity: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Conversation> {
    const id = entity.id ?? crypto.randomUUID();
    const now = new Date();
    const data = { ...entity, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.collection, id, data as Record<string, unknown>);
    return this.mapConversation(id, data as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Conversation> {
    await this.firestore.updateDocument(this.collection, id, { ...data, updatedAt: new Date() } as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Conversation ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.firestore.updateDocument(this.collection, id, { status: 'deleted', updatedAt: new Date() });
  }

  async count(filters?: readonly QueryFilter[]): Promise<number> { return (await (filters ? this.findWhere(filters) : this.findAll())).length; }
  async exists(id: string): Promise<boolean> { return (await this.firestore.getDocument(this.collection, id)) !== null; }

  // Message operations
  async addMessage(conversationId: string, msg: Omit<ConversationMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversationMessage> {
    const id = crypto.randomUUID();
    const now = new Date();
    const data = { ...msg, conversationId, createdAt: now, updatedAt: now };
    await this.firestore.createDocument(this.messagesCollection, id, data as Record<string, unknown>);
    await this.update(conversationId, {
      messageCount: ((await this.findById(conversationId))?.messageCount ?? 0) + 1,
      lastMessageAt: now,
      totalTokens: ((await this.findById(conversationId))?.totalTokens ?? 0) + (msg.tokenUsage?.totalTokens ?? 0),
    } as any);
    return { ...data, id } as ConversationMessage;
  }

  async getMessages(conversationId: string, limit = 100): Promise<readonly ConversationMessage[]> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.messagesCollection,
      [{ field: 'conversationId', operator: '==', value: conversationId }],
      { limit, orderBy: [{ field: 'sequenceNumber', direction: 'asc' }] },
    );
    return docs.map((d) => this.mapMessage(d.id, d.data));
  }

  async findByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResponse<Conversation>> {
    return this.findPaginated([{ field: 'userId', operator: '==', value: userId }], pagination);
  }

  async findByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<PaginatedResponse<Conversation>> {
    return this.findPaginated([{ field: 'workspaceId', operator: '==', value: workspaceId }], pagination);
  }

  private mapConversation(id: string, d: Record<string, unknown>): Conversation {
    return {
      id, title: (d['title'] as string) ?? '', organizationId: (d['organizationId'] as string) ?? '',
      workspaceId: (d['workspaceId'] as string) ?? '', userId: (d['userId'] as string) ?? '',
      model: (d['model'] as string) ?? '', provider: (d['provider'] as string) ?? '',
      messageCount: (d['messageCount'] as number) ?? 0, totalTokens: (d['totalTokens'] as number) ?? 0,
      status: (d['status'] as Conversation['status']) ?? 'active',
      lastMessageAt: d['lastMessageAt'] instanceof Date ? d['lastMessageAt'] as Date : d['lastMessageAt'] ? new Date(d['lastMessageAt'] as string) : null,
      metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }

  private mapMessage(id: string, d: Record<string, unknown>): ConversationMessage {
    return {
      id, conversationId: (d['conversationId'] as string) ?? '',
      role: (d['role'] as ConversationMessage['role']) ?? 'user',
      content: (d['content'] as string) ?? '',
      tokenUsage: (d['tokenUsage'] as ConversationMessage['tokenUsage']) ?? null,
      metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      sequenceNumber: (d['sequenceNumber'] as number) ?? 0,
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }
}
