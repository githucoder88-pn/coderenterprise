/**
 * Conversation Service
 *
 * Full conversation lifecycle: create, message, edit, branch, checkpoint, restore.
 */

import type {
  Conversation, Message, Branch, Checkpoint, MessageVersion,
  TokenUsage,
} from './types.js';
import type { IContextEngine } from './context-engine.js';
import type { SessionManager } from './session-manager.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';
import { BaseService } from '../../core/base-service.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse, type AuthenticatedUser } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IConversationService {
  create(input: { workspaceId: string; title?: string; model: string; provider: string; systemPrompt?: string }, actor: AuthenticatedUser): Promise<Result<Conversation>>;
  get(id: string): Promise<Result<Conversation>>;
  list(userId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>>;
  addMessage(conversationId: string, role: Message['role'], content: string, metadata?: Record<string, unknown>): Promise<Result<Message>>;
  editMessage(messageId: string, newContent: string, createBranch?: boolean): Promise<Result<Message>>;
  getMessages(conversationId: string, branchId?: string, limit?: number): Promise<Result<readonly Message[]>>;
  deleteMessage(messageId: string): Promise<Result<void>>;
  createBranch(conversationId: string, name: string, forkMessageId: string): Promise<Result<Branch>>;
  switchBranch(conversationId: string, branchId: string): Promise<Result<void>>;
  listBranches(conversationId: string): Promise<Result<readonly Branch[]>>;
  createCheckpoint(conversationId: string, name: string, description?: string): Promise<Result<Checkpoint>>;
  restoreCheckpoint(checkpointId: string): Promise<Result<void>>;
  listCheckpoints(conversationId: string): Promise<Result<readonly Checkpoint[]>>;
  rateMessage(messageId: string, rating: 'good' | 'bad', feedback?: string): Promise<Result<void>>;
  archive(id: string): Promise<Result<void>>;
  getStats(userId: string): Promise<Result<{ conversations: number; messages: number; tokens: number }>>;
}

export class ConversationService extends BaseService implements IConversationService {
  private readonly conversations = new Map<string, Conversation>();
  private readonly messages = new Map<string, Message>();
  private readonly branches = new Map<string, Branch>();
  private readonly checkpoints = new Map<string, Checkpoint>();

  constructor(
    private readonly contextEngine: IContextEngine,
    private readonly sessionManager: SessionManager,
    logger: ILogger,
    eventBus: IEventBus,
  ) { super(logger, eventBus); }

  async create(input: { workspaceId: string; title?: string; model: string; provider: string; systemPrompt?: string }, actor: AuthenticatedUser): Promise<Result<Conversation>> {
    const id = crypto.randomUUID();
    const branchId = `branch-${crypto.randomUUID()}`;
    const now = new Date();
    const conversation: Conversation = {
      id, workspaceId: input.workspaceId, organizationId: actor.organizationId,
      userId: actor.uid, title: input.title ?? 'New Conversation', model: input.model,
      provider: input.provider as any, systemPrompt: input.systemPrompt ?? null,
      messageCount: 0, totalTokens: 0, totalCost: 0, status: 'active',
      branchingEnabled: true, currentBranchId: branchId,
      metadata: {}, lastMessageAt: null, createdAt: now, updatedAt: now,
    };

    // Create default branch
    const branch: Branch = {
      id: branchId, conversationId: id, name: 'main', parentBranchId: null,
      forkMessageId: '', messageCount: 0, isActive: true,
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.conversations.set(id, conversation);
    this.branches.set(branchId, branch);

    // Create session
    await this.sessionManager.create(actor.uid, actor.organizationId, input.workspaceId, id);

    // Add system prompt as first message
    if (input.systemPrompt) {
      await this.addMessage(id, 'system', input.systemPrompt);
    }

    this.logger.info({ conversationId: id, userId: actor.uid, model: input.model }, 'Conversation created');
    return this.success(conversation);
  }

  async get(id: string): Promise<Result<Conversation>> {
    const conv = this.conversations.get(id);
    return conv ? this.success(conv) : this.failure(ErrorCode.NOT_FOUND, `Conversation ${id} not found`);
  }

  async list(userId: string, pagination: PaginationParams): Promise<Result<PaginatedResponse<Conversation>>> {
    const userConvs = [...this.conversations.values()]
      .filter((c) => c.userId === userId && c.status !== 'deleted')
      .sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
    const start = (pagination.page - 1) * pagination.limit;
    return this.success(createPaginatedResponse(userConvs.slice(start, start + pagination.limit), userConvs.length, pagination));
  }

  async addMessage(conversationId: string, role: Message['role'], content: string, metadata?: Record<string, unknown>): Promise<Result<Message>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);

    const id = crypto.randomUUID();
    const now = new Date();
    const tokenEstimate = this.contextEngine.estimateTokens(content);

    const message: Message = {
      id, conversationId, branchId: conv.currentBranchId, parentId: null,
      role, content, contentType: 'text', attachments: [], toolCalls: [], toolResults: [],
      tokenUsage: { promptTokens: tokenEstimate, completionTokens: 0, totalTokens: tokenEstimate, cachedTokens: 0, reasoningTokens: 0, cost: 0, model: conv.model, provider: conv.provider as any },
      version: 1, versions: [], status: 'completed', error: null, rating: null, feedback: null,
      metadata: metadata ?? {}, sequenceNumber: conv.messageCount, isEdited: false, editHistory: [],
      createdAt: now, updatedAt: now,
    };

    this.messages.set(id, message);

    // Update conversation
    const updated = {
      ...conv, messageCount: conv.messageCount + 1,
      totalTokens: conv.totalTokens + tokenEstimate,
      lastMessageAt: now, updatedAt: now,
    };
    this.conversations.set(conversationId, updated);

    // Update branch
    const branch = this.branches.get(conv.currentBranchId);
    if (branch) {
      this.branches.set(branch.id, { ...branch, messageCount: branch.messageCount + 1, updatedAt: now });
    }

    // Update session
    await this.sessionManager.updateActivity(conversationId);

    return this.success(message);
  }

  async editMessage(messageId: string, newContent: string, createBranch = false): Promise<Result<Message>> {
    const message = this.messages.get(messageId);
    if (!message) return this.failure(ErrorCode.NOT_FOUND, `Message ${messageId} not found`);

    const now = new Date();
    const versions: MessageVersion[] = [
      ...message.versions,
      { version: message.version, content: message.content, createdAt: message.updatedAt, tokenUsage: message.tokenUsage },
    ];

    let branchId = message.branchId;
    if (createBranch) {
      const branchResult = await this.createBranch(message.conversationId, `edit-${Date.now()}`, messageId);
      if (branchResult.success) branchId = branchResult.data.id;
    }

    const updated: Message = {
      ...message, content: newContent, version: message.version + 1, versions,
      isEdited: true, editHistory: [...message.editHistory, { content: message.content, editedAt: now }],
      tokenUsage: { ...message.tokenUsage!, totalTokens: this.contextEngine.estimateTokens(newContent) },
      branchId, updatedAt: now,
    };

    this.messages.set(messageId, updated);
    return this.success(updated);
  }

  async getMessages(conversationId: string, branchId?: string, limit = 100): Promise<Result<readonly Message[]>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);

    const targetBranch = branchId ?? conv.currentBranchId;
    const branchMessages = [...this.messages.values()]
      .filter((m) => m.conversationId === conversationId && m.branchId === targetBranch)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    return this.success(branchMessages.slice(-limit));
  }

  async deleteMessage(messageId: string): Promise<Result<void>> {
    this.messages.delete(messageId);
    return this.success(undefined);
  }

  async createBranch(conversationId: string, name: string, forkMessageId: string): Promise<Result<Branch>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);

    const id = `branch-${crypto.randomUUID()}`;
    const now = new Date();
    const branch: Branch = {
      id, conversationId, name, parentBranchId: conv.currentBranchId,
      forkMessageId, messageCount: 0, isActive: false,
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.branches.set(id, branch);
    this.logger.info({ branchId: id, conversationId, name }, 'Branch created');
    return this.success(branch);
  }

  async switchBranch(conversationId: string, branchId: string): Promise<Result<void>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);
    const branch = this.branches.get(branchId);
    if (!branch) return this.failure(ErrorCode.NOT_FOUND, `Branch ${branchId} not found`);

    // Deactivate old branch
    const oldBranch = this.branches.get(conv.currentBranchId);
    if (oldBranch) this.branches.set(oldBranch.id, { ...oldBranch, isActive: false });

    // Activate new branch
    this.branches.set(branchId, { ...branch, isActive: true });
    this.conversations.set(conversationId, { ...conv, currentBranchId: branchId, updatedAt: new Date() });

    return this.success(undefined);
  }

  async listBranches(conversationId: string): Promise<Result<readonly Branch[]>> {
    return this.success([...this.branches.values()].filter((b) => b.conversationId === conversationId));
  }

  async createCheckpoint(conversationId: string, name: string, description = ''): Promise<Result<Checkpoint>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${conversationId} not found`);

    const messages = [...this.messages.values()]
      .filter((m) => m.conversationId === conversationId && m.branchId === conv.currentBranchId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const totalUsage: TokenUsage = {
      promptTokens: messages.reduce((s, m) => s + (m.tokenUsage?.promptTokens ?? 0), 0),
      completionTokens: messages.reduce((s, m) => s + (m.tokenUsage?.completionTokens ?? 0), 0),
      totalTokens: conv.totalTokens, cachedTokens: 0, reasoningTokens: 0,
      cost: conv.totalCost, model: conv.model, provider: conv.provider as any,
    };

    const id = crypto.randomUUID();
    const now = new Date();
    const checkpoint: Checkpoint = {
      id, conversationId, branchId: conv.currentBranchId, name, description,
      messageSnapshot: messages.map((m) => m.id),
      contextSnapshot: await this.sessionManager.restoreContext(conversationId) ?? {
        maxTokens: 128000, usedTokens: conv.totalTokens, remainingTokens: 128000 - conv.totalTokens,
        messages: [], systemPrompt: conv.systemPrompt ?? '', workspaceContext: null, memoryContext: null,
        compactionApplied: false, truncationApplied: false,
      },
      tokenUsageSnapshot: totalUsage, metadata: {}, createdAt: now, updatedAt: now,
    };

    this.checkpoints.set(id, checkpoint);
    this.logger.info({ checkpointId: id, conversationId, name }, 'Checkpoint created');
    return this.success(checkpoint);
  }

  async restoreCheckpoint(checkpointId: string): Promise<Result<void>> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) return this.failure(ErrorCode.NOT_FOUND, `Checkpoint ${checkpointId} not found`);
    // Restoration: reload context from checkpoint
    await this.sessionManager.saveContext(checkpoint.conversationId, checkpoint.contextSnapshot);
    this.logger.info({ checkpointId }, 'Checkpoint restored');
    return this.success(undefined);
  }

  async listCheckpoints(conversationId: string): Promise<Result<readonly Checkpoint[]>> {
    return this.success([...this.checkpoints.values()].filter((c) => c.conversationId === conversationId));
  }

  async rateMessage(messageId: string, rating: 'good' | 'bad', feedback?: string): Promise<Result<void>> {
    const message = this.messages.get(messageId);
    if (!message) return this.failure(ErrorCode.NOT_FOUND, `Message ${messageId} not found`);
    this.messages.set(messageId, { ...message, rating, feedback: feedback ?? null, updatedAt: new Date() });
    return this.success(undefined);
  }

  async archive(id: string): Promise<Result<void>> {
    const conv = this.conversations.get(id);
    if (!conv) return this.failure(ErrorCode.NOT_FOUND, `Conversation ${id} not found`);
    this.conversations.set(id, { ...conv, status: 'archived', updatedAt: new Date() });
    return this.success(undefined);
  }

  async getStats(userId: string): Promise<Result<{ conversations: number; messages: number; tokens: number }>> {
    const userConvs = [...this.conversations.values()].filter((c) => c.userId === userId && c.status === 'active');
    return this.success({
      conversations: userConvs.length,
      messages: userConvs.reduce((s, c) => s + c.messageCount, 0),
      tokens: userConvs.reduce((s, c) => s + c.totalTokens, 0),
    });
  }
}
