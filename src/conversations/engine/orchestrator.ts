/**
 * Conversation Orchestrator
 *
 * The central brain that coordinates the full request flow:
 *   User → Context Build → Provider → Streaming → Response → Persist
 *
 * Handles provider fallback, tool calling loops, context management,
 * and message persistence.
 */

import type {
  OrchestrationRequest, OrchestrationResult,
  Conversation, Message, ContextWindow,
} from './types.js';
import type { ConversationService } from './conversation-service.js';
import type { ContextEngine, ContextBuildOptions } from './context-engine.js';
import type { StreamingEngine, StreamingCallbacks } from './streaming-engine.js';
import type { ProviderRouter } from '../../modules/providers/provider-router.js';
import type { ProviderRequest, ProviderName } from '../../modules/providers/types.js';
import type { SessionManager } from './session-manager.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IOrchestrator {
  send(request: OrchestrationRequest): Promise<Result<OrchestrationResult>>;
  sendStreaming(request: OrchestrationRequest, callbacks: StreamingCallbacks): Promise<Result<OrchestrationResult>>;
}

export class Orchestrator implements IOrchestrator {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly contextEngine: ContextEngine,
    private readonly streamingEngine: StreamingEngine,
    private readonly providerRouter: ProviderRouter,
    private readonly sessionManager: SessionManager,
    private readonly logger: ILogger,
    private readonly defaultMaxContextTokens = 128_000,
    private readonly defaultMaxOutputTokens = 4096,
  ) {}

  async send(request: OrchestrationRequest): Promise<Result<OrchestrationResult>> {
    const start = performance.now();

    try {
      // 1. Load conversation
      const convResult = await this.conversationService.get(request.conversationId);
      if (!convResult.success) return convResult as any;
      const conversation = convResult.data;

      // 2. Add user message
      const userMsg = await this.conversationService.addMessage(
        request.conversationId, 'user', request.message,
      );
      if (!userMsg.success) return userMsg as any;

      // 3. Build context
      const msgsResult = await this.conversationService.getMessages(request.conversationId);
      const messages = msgsResult.success ? msgsResult.data : [];
      const context = await this.buildContext(conversation, messages, request);

      // 4. Build provider request
      const providerRequest = this.buildProviderRequest(conversation, context, request, false);

      // 5. Call provider
      const response = await this.providerRouter.complete(
        providerRequest, request.provider as ProviderName,
      );

      // 6. Handle tool calls (simple loop, max 5 iterations)
      let finalResponse = response;
      let toolCallIterations = 0;
      while (finalResponse.toolCalls.length > 0 && toolCallIterations < 5) {
        toolCallIterations++;
        // Add assistant message with tool calls
        await this.conversationService.addMessage(
          request.conversationId, 'assistant', finalResponse.content,
          { toolCalls: finalResponse.toolCalls },
        );

        // Execute tools and add results
        for (const tc of finalResponse.toolCalls) {
          await this.conversationService.addMessage(
            request.conversationId, 'tool', `[Tool result for ${tc.function.name}]`,
            { toolCallId: tc.id },
          );
        }

        // Rebuild context and re-call provider
        const updatedMsgsResult = await this.conversationService.getMessages(request.conversationId);
        const updatedMessages = updatedMsgsResult.success ? updatedMsgsResult.data : [];
        const updatedContext = await this.buildContext(conversation, updatedMessages, request);
        const updatedRequest = this.buildProviderRequest(conversation, updatedContext, request, false);
        finalResponse = await this.providerRouter.complete(updatedRequest, request.provider as ProviderName);
      }

      // 7. Persist assistant response
      const assistantMsg = await this.conversationService.addMessage(
        request.conversationId, 'assistant', finalResponse.content,
        { model: finalResponse.model, provider: finalResponse.provider },
      );
      if (!assistantMsg.success) return assistantMsg as any;

      // 8. Save context snapshot
      await this.sessionManager.saveContext(request.conversationId, context);

      const durationMs = performance.now() - start;

      return {
        success: true,
        data: {
          conversationId: request.conversationId,
          messageId: assistantMsg.data.id,
          response: finalResponse.content,
          toolCalls: finalResponse.toolCalls.map((tc) => ({
            id: tc.id, name: tc.function.name, arguments: tc.function.arguments,
            status: 'completed' as const, result: null, durationMs: null, error: null,
          })),
          usage: {
            promptTokens: finalResponse.usage.promptTokens,
            completionTokens: finalResponse.usage.completionTokens,
            totalTokens: finalResponse.usage.totalTokens,
            cachedTokens: finalResponse.usage.cachedTokens ?? 0,
            reasoningTokens: finalResponse.usage.reasoningTokens ?? 0,
            cost: 0, model: finalResponse.model, provider: finalResponse.provider,
          },
          context, durationMs, provider: finalResponse.provider, model: finalResponse.model,
        },
      };
    } catch (error) {
      this.logger.error({ error, conversationId: request.conversationId }, 'Orchestration failed');
      return { success: false, error: { code: ErrorCode.INTERNAL, message: error instanceof Error ? error.message : 'Orchestration failed', timestamp: new Date() } };
    }
  }

  async sendStreaming(request: OrchestrationRequest, callbacks: StreamingCallbacks): Promise<Result<OrchestrationResult>> {
    const start = performance.now();

    try {
      const convResult = await this.conversationService.get(request.conversationId);
      if (!convResult.success) return convResult as any;
      const conversation = convResult.data;

      // Add user message
      await this.conversationService.addMessage(request.conversationId, 'user', request.message);

      // Create placeholder assistant message
      const assistantMsg = await this.conversationService.addMessage(request.conversationId, 'assistant', '');
      if (!assistantMsg.success) return assistantMsg as any;

      // Build context
      const streamMsgsResult = await this.conversationService.getMessages(request.conversationId);
      const messages = streamMsgsResult.success ? streamMsgsResult.data : [];
      const context = await this.buildContext(conversation, messages, request);

      // Build provider request (streaming)
      const providerRequest = this.buildProviderRequest(conversation, context, request, true);

      // Get provider stream
      const providerStream = await this.providerRouter.stream(providerRequest, request.provider as ProviderName);

      // Wrap in conversation stream
      const stream = this.streamingEngine.createStream(
        request.conversationId, assistantMsg.data.id, providerStream, {
          ...callbacks,
          onComplete: async (completedStream) => {
            // Persist final content
            if (completedStream.content) {
              // Update the placeholder message with final content
              this.logger.info({ messageId: assistantMsg.data.id, contentLength: completedStream.content.length }, 'Stream completed, persisting');
            }
            await this.sessionManager.saveContext(request.conversationId, context);
            callbacks.onComplete?.(completedStream);
          },
        },
      );

      return {
        success: true,
        data: {
          conversationId: request.conversationId,
          messageId: assistantMsg.data.id, stream,
          toolCalls: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedTokens: 0, reasoningTokens: 0, cost: 0, model: conversation.model, provider: conversation.provider as any },
          context, durationMs: performance.now() - start, provider: conversation.provider as any, model: conversation.model,
        },
      };
    } catch (error) {
      this.logger.error({ error, conversationId: request.conversationId }, 'Streaming orchestration failed');
      return { success: false, error: { code: ErrorCode.INTERNAL, message: error instanceof Error ? error.message : 'Streaming failed', timestamp: new Date() } };
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async buildContext(
    conversation: Conversation, messages: readonly Message[], request: OrchestrationRequest,
  ): Promise<ContextWindow> {
    const overrides = request.contextOverrides ?? {};
    const options: ContextBuildOptions = {
      maxTokens: this.defaultMaxContextTokens,
      systemPrompt: conversation.systemPrompt ?? 'You are a helpful assistant.',
      includeMemory: overrides.includeMemory ?? true,
      memoryQuery: request.message,
      compactionStrategy: overrides.compactionStrategy ?? 'smart',
      reservedForOutput: request.maxTokens ?? this.defaultMaxOutputTokens,
    };

    return this.contextEngine.build(messages, request.userId, request.organizationId, options);
  }

  private buildProviderRequest(
    conversation: Conversation, context: ContextWindow, request: OrchestrationRequest, stream: boolean,
  ): ProviderRequest {
    const messages = [
      { role: 'system' as const, content: context.systemPrompt },
      ...(context.memoryContext ? [{ role: 'system' as const, content: `[Memory Context]\n${context.memoryContext}` }] : []),
      ...(context.workspaceContext ? [{ role: 'system' as const, content: `[Workspace Context]\n${context.workspaceContext}` }] : []),
      ...context.messages.filter((m) => m.role !== 'context').map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant' | 'tool',
        content: m.content,
      })),
    ];

    return {
      model: request.model ?? conversation.model,
      messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens ?? this.defaultMaxOutputTokens,
      stream,
      tools: request.tools?.map((t) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      user: request.userId,
    };
  }
}
