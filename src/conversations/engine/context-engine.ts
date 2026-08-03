/**
 * Context Engine
 *
 * Builds, compacts, and manages the context window sent to LLMs.
 * Combines recent messages, long-term memory, workspace context,
 * system instructions, and tool outputs into a single context.
 */

import type { ContextWindow, ContextMessage, Message } from './types.js';
import type { IMemoryService } from './memory-service.js';

export interface ContextBuildOptions {
  readonly maxTokens: number;
  readonly systemPrompt: string;
  readonly workspaceContext?: string;
  readonly includeMemory?: boolean;
  readonly memoryQuery?: string;
  readonly toolOutputs?: readonly string[];
  readonly externalSources?: readonly string[];
  readonly compactionStrategy: 'truncate' | 'summarize' | 'smart';
  readonly reservedForOutput?: number;
}

export interface IContextEngine {
  build(messages: readonly Message[], userId: string, orgId: string, options: ContextBuildOptions): Promise<ContextWindow>;
  compact(context: ContextWindow, strategy: ContextBuildOptions['compactionStrategy']): Promise<ContextWindow>;
  estimateTokens(text: string): number;
  summarize(messages: readonly Message[]): Promise<string>;
  injectSystemPrompt(context: ContextWindow, prompt: string): ContextWindow;
  appendContext(context: ContextWindow, label: string, content: string): ContextWindow;
}

export class ContextEngine implements IContextEngine {
  constructor(
    private readonly memoryService: IMemoryService,
  ) {}

  async build(
    messages: readonly Message[],
    userId: string,
    orgId: string,
    options: ContextBuildOptions,
  ): Promise<ContextWindow> {
    const maxTokens = options.maxTokens - (options.reservedForOutput ?? 4096);
    const contextMessages: ContextMessage[] = [];
    let usedTokens = 0;

    // 1. System prompt (highest priority)
    const systemTokens = this.estimateTokens(options.systemPrompt);
    usedTokens += systemTokens;

    // 2. Workspace context
    let workspaceContext: string | null = null;
    if (options.workspaceContext) {
      workspaceContext = options.workspaceContext;
      usedTokens += this.estimateTokens(workspaceContext);
    }

    // 3. Memory context
    let memoryContext: string | null = null;
    if (options.includeMemory && options.memoryQuery) {
      const remainingForMemory = Math.floor((maxTokens - usedTokens) * 0.3);
      memoryContext = await this.memoryService.getRelevantContext(
        userId, orgId, options.memoryQuery, remainingForMemory,
      );
      usedTokens += this.estimateTokens(memoryContext);
    }

    // 4. Tool outputs
    if (options.toolOutputs?.length) {
      for (const output of options.toolOutputs) {
        const tokens = this.estimateTokens(output);
        contextMessages.push({
          role: 'tool', content: output, tokenEstimate: tokens,
          priority: 70, isCompacted: false, originalMessageId: null,
        });
        usedTokens += tokens;
      }
    }

    // 5. External sources
    if (options.externalSources?.length) {
      for (const source of options.externalSources) {
        const tokens = this.estimateTokens(source);
        contextMessages.push({
          role: 'context', content: source, tokenEstimate: tokens,
          priority: 60, isCompacted: false, originalMessageId: null,
        });
        usedTokens += tokens;
      }
    }

    // 6. Messages (most recent first, then compact older ones)
    const remainingTokens = maxTokens - usedTokens;
    const messageContext = this.fitMessages(messages, remainingTokens);

    for (const msg of messageContext) {
      contextMessages.push(msg);
      usedTokens += msg.tokenEstimate;
    }

    // Apply compaction if over budget
    let compactionApplied = false;
    let truncationApplied = false;

    if (usedTokens > maxTokens) {
      const compacted = await this.compact(
        {
          maxTokens, usedTokens, remainingTokens: maxTokens - usedTokens,
          messages: contextMessages, systemPrompt: options.systemPrompt,
          workspaceContext, memoryContext, compactionApplied: false, truncationApplied: false,
        },
        options.compactionStrategy,
      );
      contextMessages.length = 0;
      contextMessages.push(...compacted.messages);
      usedTokens = compacted.usedTokens;
      compactionApplied = true;
    }

    return {
      maxTokens, usedTokens, remainingTokens: maxTokens - usedTokens,
      messages: contextMessages, systemPrompt: options.systemPrompt,
      workspaceContext, memoryContext, compactionApplied, truncationApplied,
    };
  }

  async compact(
    context: ContextWindow,
    strategy: ContextBuildOptions['compactionStrategy'],
  ): Promise<ContextWindow> {
    switch (strategy) {
      case 'truncate':
        return this.truncate(context);
      case 'summarize':
        return this.summarizeContext(context);
      case 'smart':
        return this.smartCompact(context);
      default:
        return this.truncate(context);
    }
  }

  estimateTokens(text: string): number {
    // ~3.5 chars per token for English, ~4 for code
    return Math.ceil(text.length / 3.5);
  }

  async summarize(messages: readonly Message[]): Promise<string> {
    // Extract key points from messages
    const keyPoints: string[] = [];
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        const content = msg.content.slice(0, 200);
        keyPoints.push(`[${msg.role}]: ${content}`);
      }
    }

    return keyPoints.join('\n');
  }

  injectSystemPrompt(context: ContextWindow, prompt: string): ContextWindow {
    return { ...context, systemPrompt: prompt, usedTokens: context.usedTokens + this.estimateTokens(prompt) };
  }

  appendContext(context: ContextWindow, label: string, content: string): ContextWindow {
    const tokens = this.estimateTokens(content);
    const newMessage: ContextMessage = {
      role: 'context', content: `[${label}] ${content}`, tokenEstimate: tokens,
      priority: 50, isCompacted: false, originalMessageId: null,
    };
    return {
      ...context,
      messages: [...context.messages, newMessage],
      usedTokens: context.usedTokens + tokens,
      remainingTokens: context.remainingTokens - tokens,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private fitMessages(messages: readonly Message[], maxTokens: number): ContextMessage[] {
    const result: ContextMessage[] = [];
    let usedTokens = 0;

    // Start from most recent messages, work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const tokens = this.estimateTokens(msg.content);
      const priority = this.getMessagePriority(msg, i, messages.length);

      if (usedTokens + tokens > maxTokens) {
        // Try to fit a summary of remaining messages
        const remaining = messages.slice(0, i + 1);
        const summary = this.quickSummarize(remaining);
        const summaryTokens = this.estimateTokens(summary);

        if (usedTokens + summaryTokens <= maxTokens) {
          result.unshift({
            role: 'context', content: summary, tokenEstimate: summaryTokens,
            priority: 20, isCompacted: true, originalMessageId: null,
          });
        }
        break;
      }

      result.unshift({
        role: msg.role, content: msg.content, tokenEstimate: tokens,
        priority, isCompacted: false, originalMessageId: msg.id,
      });
      usedTokens += tokens;
    }

    return result;
  }

  private getMessagePriority(msg: Message, index: number, total: number): number {
    // Most recent messages get highest priority
    const recency = (index / total) * 100;

    // System messages always high
    if (msg.role === 'system') return 100;

    // User questions high priority
    if (msg.role === 'user') return Math.max(80, recency);

    // Tool results medium
    if (msg.role === 'tool') return 60;

    // Assistant responses scale with recency
    return Math.max(40, recency);
  }

  private truncate(context: ContextWindow): ContextWindow {
    const messages = [...context.messages].sort((a, b) => b.priority - a.priority);
    const kept: ContextMessage[] = [];
    let usedTokens = 0;
    const budget = context.maxTokens * 0.8;

    for (const msg of messages) {
      if (usedTokens + msg.tokenEstimate <= budget) {
        kept.push(msg);
        usedTokens += msg.tokenEstimate;
      }
    }

    // Re-sort by original order
    kept.sort((a, b) => {
      const ai = context.messages.indexOf(a);
      const bi = context.messages.indexOf(b);
      return ai - bi;
    });

    return { ...context, messages: kept, usedTokens, remainingTokens: context.maxTokens - usedTokens, truncationApplied: true };
  }

  private summarizeContext(context: ContextWindow): ContextWindow {
    const lowPriority = context.messages.filter((m) => m.priority < 50);
    const highPriority = context.messages.filter((m) => m.priority >= 50);

    // Summarize low-priority messages into a single context message
    if (lowPriority.length > 0) {
      const summary = lowPriority.map((m) => `[${m.role}]: ${m.content.slice(0, 100)}`).join('\n');
      const summaryMsg: ContextMessage = {
        role: 'context', content: `[Previous conversation summary]\n${summary}`,
        tokenEstimate: this.estimateTokens(summary), priority: 30,
        isCompacted: true, originalMessageId: null,
      };

      const usedTokens = highPriority.reduce((sum, m) => sum + m.tokenEstimate, 0) + summaryMsg.tokenEstimate;
      return { ...context, messages: [...highPriority, summaryMsg], usedTokens, remainingTokens: context.maxTokens - usedTokens, compactionApplied: true };
    }

    return context;
  }

  private smartCompact(context: ContextWindow): ContextWindow {
    // Start with summarize, then truncate if still over
    let result = this.summarizeContext(context);
    if (result.usedTokens > result.maxTokens) {
      result = this.truncate(result);
    }
    return result;
  }

  private quickSummarize(messages: readonly Message[]): string {
    const parts = messages.slice(0, 5).map((m) => {
      const preview = m.content.slice(0, 80);
      return `[${m.role}]: ${preview}${m.content.length > 80 ? '...' : ''}`;
    });
    if (messages.length > 5) parts.unshift(`[...${messages.length - 5} earlier messages omitted]`);
    return parts.join('\n');
  }
}
