/**
 * Context Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextEngine } from '../../../conversations/engine/context-engine.js';
import type { IMemoryService } from '../../../conversations/engine/memory-service.js';
import type { Message } from '../../../conversations/engine/types.js';
import { createMockLogger } from '../../helpers.js';

function createMockMemory(): IMemoryService {
  return {
    store: vi.fn(async () => ({} as any)),
    retrieve: vi.fn(async () => []),
    get: vi.fn(async () => null),
    update: vi.fn(async () => ({} as any)),
    delete: vi.fn(async () => {}),
    consolidate: vi.fn(async () => 0),
    getRelevantContext: vi.fn(async () => 'User prefers TypeScript. Working on API project.'),
    getStats: vi.fn(async () => ({ total: 5, byType: { short_term: 2, long_term: 3, episodic: 0, semantic: 0 }, totalTokens: 500 })),
  };
}

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`, conversationId: 'conv-1', branchId: 'branch-1', parentId: null,
    role: (i % 2 === 0 ? 'user' : 'assistant') as Message['role'],
    content: `Message ${i}: ${'word '.repeat(20)}`, contentType: 'text' as const,
    attachments: [], toolCalls: [], toolResults: [],
    tokenUsage: { promptTokens: 50, completionTokens: 0, totalTokens: 50, cachedTokens: 0, reasoningTokens: 0, cost: 0, model: 'test', provider: 'openai' as any },
    version: 1, versions: [], status: 'completed' as const, error: null, rating: null, feedback: null,
    metadata: {}, sequenceNumber: i, isEdited: false, editHistory: [],
    createdAt: new Date(), updatedAt: new Date(),
  }));
}

describe('ContextEngine', () => {
  let engine: ContextEngine;
  let memory: IMemoryService;

  beforeEach(() => {
    memory = createMockMemory();
    engine = new ContextEngine(memory, createMockLogger());
  });

  describe('estimateTokens', () => {
    it('should estimate tokens consistently', () => {
      expect(engine.estimateTokens('hello')).toBeGreaterThan(0);
      expect(engine.estimateTokens('a'.repeat(1000))).toBeGreaterThan(200);
    });

    it('should scale linearly', () => {
      const short = engine.estimateTokens('hello');
      const long = engine.estimateTokens('hello world test string');
      expect(long).toBeGreaterThan(short);
    });
  });

  describe('build', () => {
    it('should build context with system prompt', async () => {
      const messages = makeMessages(5);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'You are helpful.',
        compactionStrategy: 'truncate',
      });

      expect(context.systemPrompt).toBe('You are helpful.');
      expect(context.messages.length).toBeGreaterThan(0);
      expect(context.usedTokens).toBeGreaterThan(0);
    });

    it('should include memory context when requested', async () => {
      const messages = makeMessages(3);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', includeMemory: true,
        memoryQuery: 'TypeScript project', compactionStrategy: 'smart',
      });

      expect(context.memoryContext).toContain('TypeScript');
      expect(memory.getRelevantContext).toHaveBeenCalled();
    });

    it('should handle messages within budget', async () => {
      const messages = makeMessages(10);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', compactionStrategy: 'truncate',
      });

      expect(context.remainingTokens).toBeGreaterThan(0);
      expect(context.usedTokens).toBeLessThanOrEqual(context.maxTokens);
    });

    it('should apply compaction when over budget', async () => {
      const messages = makeMessages(500);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 2000, systemPrompt: 'test', compactionStrategy: 'truncate',
        reservedForOutput: 500,
      });

      expect(context.usedTokens).toBeLessThanOrEqual(context.maxTokens);
    });
  });

  describe('compact', () => {
    it('should truncate keeping highest priority', async () => {
      const messages = makeMessages(10);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', compactionStrategy: 'truncate',
      });

      const compacted = await engine.compact(context, 'truncate');
      expect(compacted.truncationApplied).toBe(true);
    });

    it('should summarize low-priority messages', async () => {
      const messages = makeMessages(20);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', compactionStrategy: 'summarize',
      });

      const compacted = await engine.compact(context, 'summarize');
      expect(compacted.compactionApplied).toBe(true);
    });

    it('should smart compact', async () => {
      const messages = makeMessages(20);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', compactionStrategy: 'smart',
      });

      const compacted = await engine.compact(context, 'smart');
      expect(compacted.messages.length).toBeGreaterThan(0);
    });
  });

  describe('injectSystemPrompt', () => {
    it('should inject a new system prompt', async () => {
      const messages = makeMessages(2);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'Original', compactionStrategy: 'truncate',
      });

      const updated = engine.injectSystemPrompt(context, 'New prompt');
      expect(updated.systemPrompt).toBe('New prompt');
      expect(updated.usedTokens).toBeGreaterThan(context.usedTokens);
    });
  });

  describe('appendContext', () => {
    it('should append context label', async () => {
      const messages = makeMessages(2);
      const context = await engine.build(messages, 'user-1', 'org-1', {
        maxTokens: 128000, systemPrompt: 'test', compactionStrategy: 'truncate',
      });

      const updated = engine.appendContext(context, 'workspace', 'src/index.ts: 42 lines');
      expect(updated.messages.some((m) => m.content.includes('[workspace]'))).toBe(true);
    });
  });

  describe('summarize', () => {
    it('should summarize messages', async () => {
      const messages = makeMessages(10);
      const summary = await engine.summarize(messages);
      expect(summary).toContain('[user]');
      expect(summary).toContain('[assistant]');
    });
  });
});
