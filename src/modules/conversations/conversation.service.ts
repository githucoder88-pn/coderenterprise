/**
 * Conversation Storage Service
 */

import { BaseService } from '../../core/base-service.js';
import type { ConversationRepository } from './conversation.repository.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import type { Conversation, ConversationMessage, CreateConversationInput, AddMessageInput } from './conversation.types.js';
import { CreateConversationSchema, AddMessageSchema } from './conversation.types.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';

export interface IConversationService {
  getById(id: string): Promise<Result<Conversation>>;
  create(input: CreateConversationInput, actor: AuthenticatedUser): Promise<Result<Conversation>>;
  delete(id: string, actor: AuthenticatedUser): Promise<Result<void>>;
  addMessage(conversationId: string, input: AddMessageInput): Promise<Result<ConversationMessage>>;
  getMessages(conversationId: string, limit?: number): Promise<Result<readonly ConversationMessage[]>>;
  listByUser(userId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>>;
  listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>>;
  archive(id: string, actor: AuthenticatedUser): Promise<Result<Conversation>>;
  getStats(userId: string): Promise<Result<{ totalConversations: number; totalMessages: number; totalTokens: number }>>;
}

export class ConversationService extends BaseService implements IConversationService {
  constructor(private readonly repo: ConversationRepository, logger: ILogger, eventBus: IEventBus) {
    super(logger, eventBus);
  }

  async getById(id: string): Promise<Result<Conversation>> {
    const conv = await this.repo.findById(id);
    return conv ? this.success(conv) : this.failure(ErrorCode.NOT_FOUND, `Conversation ${id} not found`);
  }

  async create(input: CreateConversationInput, actor: AuthenticatedUser): Promise<Result<Conversation>> {
    const parsed = CreateConversationSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const conv = await this.repo.create({
      title: parsed.data.title ?? 'Untitled Conversation', organizationId: parsed.data.organizationId,
      workspaceId: parsed.data.workspaceId, userId: actor.uid, model: parsed.data.model,
      provider: parsed.data.provider, messageCount: 0, totalTokens: 0, status: 'active',
      lastMessageAt: null, metadata: parsed.data.metadata ?? {},
    });
    if (parsed.data.systemPrompt) {
      await this.addMessage(conv.id, { role: 'system', content: parsed.data.systemPrompt });
    }
    return this.success(conv);
  }

  async delete(id: string, _actor: AuthenticatedUser): Promise<Result<void>> {
    const conv = await this.repo.findById(id);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${id} not found`);
    await this.repo.delete(id);
    return this.success(undefined);
  }

  async addMessage(conversationId: string, input: AddMessageInput): Promise<Result<ConversationMessage>> {
    const parsed = AddMessageSchema.safeParse(input);
    if (!parsed.success) return this.failure(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const conv = await this.repo.findById(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);
    const msg = await this.repo.addMessage(conversationId, {
      conversationId, role: parsed.data.role, content: parsed.data.content,
      tokenUsage: parsed.data.tokenUsage ?? null, metadata: parsed.data.metadata ?? {}, sequenceNumber: conv.messageCount,
    });
    return this.success(msg);
  }

  async getMessages(conversationId: string, limit = 100): Promise<Result<readonly ConversationMessage[]>> {
    return this.success(await this.repo.getMessages(conversationId, limit));
  }

  async listByUser(userId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>> {
    return this.success(await this.repo.findByUser(userId, pagination));
  }

  async listByWorkspace(workspaceId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>> {
    return this.success(await this.repo.findByWorkspace(workspaceId, pagination));
  }

  async archive(id: string, _actor: AuthenticatedUser): Promise<Result<Conversation>> {
    const conv = await this.repo.findById(id);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${id} not found`);
    return this.success(await this.repo.update(id, { status: 'archived' }));
  }

  async getStats(userId: string): Promise<Result<{ totalConversations: number; totalMessages: number; totalTokens: number }>> {
    const convs = await this.repo.findWhere([{ field: 'userId', operator: '==', value: userId }]);
    return this.success({
      totalConversations: convs.length,
      totalMessages: convs.reduce((sum, c) => sum + c.messageCount, 0),
      totalTokens: convs.reduce((sum, c) => sum + c.totalTokens, 0),
    });
  }
}
