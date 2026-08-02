/**
 * Conversation Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationService } from '../../../conversations/engine/conversation-service.js';
import { ContextEngine } from '../../../conversations/engine/context-engine.js';
import { SessionManager } from '../../../conversations/engine/session-manager.js';
import type { IMemoryService } from '../../../conversations/engine/memory-service.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';
import { EventBus } from '../../../core/event-bus.js';
import { createMockLogger, createMockUser } from '../../helpers.js';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0), getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async () => 0), has: vi.fn(async () => false), ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

function createMockMemory(): IMemoryService {
  return {
    store: vi.fn(async () => ({} as any)), retrieve: vi.fn(async () => []),
    get: vi.fn(async () => null), update: vi.fn(async () => ({} as any)),
    delete: vi.fn(async () => {}), consolidate: vi.fn(async () => 0),
    getRelevantContext: vi.fn(async () => ''), getStats: vi.fn(async () => ({ total: 0, byType: { short_term: 0, long_term: 0, episodic: 0, semantic: 0 }, totalTokens: 0 })),
  };
}

describe('ConversationService', () => {
  let service: ConversationService;
  let contextEngine: ContextEngine;
  let sessionManager: SessionManager;
  const user = createMockUser();

  beforeEach(() => {
    const cache = createMockCache();
    const memory = createMockMemory();
    const logger = createMockLogger();
    const eventBus = new EventBus();
    contextEngine = new ContextEngine(memory, logger);
    sessionManager = new SessionManager(cache, logger);
    service = new ConversationService(contextEngine, sessionManager, logger, eventBus);
  });

  describe('create', () => {
    it('should create a conversation', async () => {
      const result = await service.create({
        workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai',
      }, user);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('gpt-4o');
        expect(result.data.status).toBe('active');
        expect(result.data.branchingEnabled).toBe(true);
      }
    });

    it('should create with system prompt', async () => {
      const result = await service.create({
        workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai',
        systemPrompt: 'You are a coding assistant.',
      }, user);

      expect(result.success).toBe(true);
      if (result.success) {
        const messages = await service.getMessages(result.data.id);
        expect(messages.data?.some((m) => m.role === 'system')).toBe(true);
      }
    });
  });

  describe('addMessage', () => {
    it('should add messages to a conversation', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      const msg = await service.addMessage(conv.id, 'user', 'Hello!');

      expect(msg.success).toBe(true);
      if (msg.success) {
        expect(msg.data.content).toBe('Hello!');
        expect(msg.data.role).toBe('user');
      }
    });

    it('should track token usage', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      await service.addMessage(conv.id, 'user', 'Hello world test message');

      const updated = (await service.get(conv.id)).data!;
      expect(updated.totalTokens).toBeGreaterThan(0);
      expect(updated.messageCount).toBeGreaterThan(0);
    });
  });

  describe('editMessage', () => {
    it('should edit a message and track version', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      const msg = (await service.addMessage(conv.id, 'user', 'Original content')).data!;

      const edited = await service.editMessage(msg.id, 'Edited content');
      expect(edited.success).toBe(true);
      if (edited.success) {
        expect(edited.data.content).toBe('Edited content');
        expect(edited.data.isEdited).toBe(true);
        expect(edited.data.version).toBe(2);
        expect(edited.data.versions.length).toBe(1);
        expect(edited.data.editHistory.length).toBe(1);
      }
    });

    it('should create branch when editMessage with createBranch', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      const msg = (await service.addMessage(conv.id, 'user', 'Original')).data!;

      const edited = await service.editMessage(msg.id, 'Alternative', true);
      expect(edited.success).toBe(true);
      if (edited.success) {
        expect(edited.data.branchId).not.toBe(conv.currentBranchId);
      }
    });
  });

  describe('branching', () => {
    it('should create and switch branches', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      await service.addMessage(conv.id, 'user', 'Main message');

      const branch = await service.createBranch(conv.id, 'alternative', '');
      expect(branch.success).toBe(true);

      const branches = await service.listBranches(conv.id);
      expect(branches.data?.length).toBeGreaterThanOrEqual(2);

      if (branch.success) {
        const switched = await service.switchBranch(conv.id, branch.data.id);
        expect(switched.success).toBe(true);

        const updated = (await service.get(conv.id)).data!;
        expect(updated.currentBranchId).toBe(branch.data.id);
      }
    });
  });

  describe('checkpoints', () => {
    it('should create and restore checkpoints', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      await service.addMessage(conv.id, 'user', 'Message before checkpoint');

      const checkpoint = await service.createCheckpoint(conv.id, 'v1.0', 'First checkpoint');
      expect(checkpoint.success).toBe(true);

      const checkpoints = await service.listCheckpoints(conv.id);
      expect(checkpoints.data?.length).toBe(1);

      if (checkpoint.success) {
        const restored = await service.restoreCheckpoint(checkpoint.data.id);
        expect(restored.success).toBe(true);
      }
    });
  });

  describe('rateMessage', () => {
    it('should rate a message', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      const msg = (await service.addMessage(conv.id, 'assistant', 'Here is a helpful response')).data!;

      const rated = await service.rateMessage(msg.id, 'good', 'Very helpful!');
      expect(rated.success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return conversation stats', async () => {
      await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user);
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      await service.addMessage(conv.id, 'user', 'Test');

      const stats = await service.getStats(user.uid);
      expect(stats.success).toBe(true);
      if (stats.success) {
        expect(stats.data.conversations).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('archive', () => {
    it('should archive a conversation', async () => {
      const conv = (await service.create({ workspaceId: 'ws-1', model: 'gpt-4o', provider: 'openai' }, user)).data!;
      const archived = await service.archive(conv.id);
      expect(archived.success).toBe(true);

      const updated = (await service.get(conv.id)).data!;
      expect(updated.status).toBe('archived');
    });
  });
});
