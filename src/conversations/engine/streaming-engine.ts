/**
 * Streaming Engine
 *
 * Manages SSE streams for real-time conversation responses.
 * Handles chunk accumulation, tool call detection, abort signals.
 */

import type { ConversationStream, TokenUsage, MessageToolCall } from './types.js';
import type { ProviderStream, StreamChunk } from '../../modules/providers/types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface StreamingCallbacks {
  readonly onChunk?: (chunk: StreamChunk) => void;
  readonly onContent?: (delta: string) => void;
  readonly onToolCall?: (toolCall: Partial<MessageToolCall>) => void;
  readonly onComplete?: (stream: ConversationStream) => void;
  readonly onError?: (error: Error) => void;
}

export interface IStreamingEngine {
  createStream(
    conversationId: string,
    messageId: string,
    providerStream: ProviderStream,
    callbacks?: StreamingCallbacks,
  ): ConversationStream;
  getActiveStreams(): readonly ConversationStream[];
  abortStream(streamId: string): void;
  abortAll(): void;
}

export class StreamingEngine implements IStreamingEngine {
  private readonly activeStreams = new Map<string, ConversationStream>();

  constructor(private readonly logger: ILogger) {}

  createStream(
    conversationId: string,
    messageId: string,
    providerStream: ProviderStream,
    callbacks?: StreamingCallbacks,
  ): ConversationStream {
    const id = `stream-${crypto.randomUUID()}`;
    const chunks: StreamChunk[] = [];
    let content = '';
    let toolCalls: MessageToolCall[] = [];
    let usage: TokenUsage | null = null;
    let status: ConversationStream['status'] = 'connecting';
    let aborted = false;
    const startedAt = new Date();

    const iterator: AsyncIterator<StreamChunk> = {
      async next(): Promise<IteratorResult<StreamChunk>> {
        if (aborted) return { done: true, value: undefined };

        try {
          const result = await providerStream[Symbol.asyncIterator]().next();
          if (result.done) {
            status = 'completed';
            
            const stream = getStream();
            callbacks?.onComplete?.(stream);
            return { done: true, value: undefined };
          }

          const chunk = result.value;
          chunks.push(chunk);

          // Accumulate content
          if (chunk.delta.content) {
            content += chunk.delta.content;
            callbacks?.onContent?.(chunk.delta.content);
          }

          // Handle tool calls
          if (chunk.delta.toolCalls?.length) {
            for (const tc of chunk.delta.toolCalls) {
              if (tc.id) {
                toolCalls.push({
                  id: tc.id, name: tc.function?.name ?? '',
                  arguments: tc.function?.arguments ?? '',
                  status: 'pending', result: null, durationMs: null, error: null,
                });
              } else if (tc.function?.arguments) {
                // Append to last tool call
                const lastIdx = toolCalls.length - 1;
                if (lastIdx >= 0) {
                  toolCalls[lastIdx] = { ...toolCalls[lastIdx]!, arguments: toolCalls[lastIdx]!.arguments + tc.function.arguments };
                }
              }
            }
            callbacks?.onToolCall?.(toolCalls[toolCalls.length - 1]!);
          }

          // Handle usage
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.promptTokens ?? 0,
              completionTokens: chunk.usage.completionTokens ?? 0,
              totalTokens: chunk.usage.totalTokens ?? 0,
              cachedTokens: chunk.usage.cachedTokens ?? 0,
              reasoningTokens: chunk.usage.reasoningTokens ?? 0,
              cost: 0, model: providerStream.model, provider: providerStream.provider,
            };
          }

          status = 'streaming';
          callbacks?.onChunk?.(chunk);
          return result;
        } catch (error) {
          status = 'failed';
          const err = error instanceof Error ? error : new Error(String(error));
          callbacks?.onError?.(err);
          throw err;
        }
      },
    };

    function getStream(): ConversationStream {
      const stream: ConversationStream = {
        id, conversationId, messageId, status,
        chunks, content, toolCalls, usage,
        startedAt, completedAt: status === 'completed' ? new Date() : null,
        durationMs: status === 'completed' ? Date.now() - startedAt.getTime() : null,
        abort() {
          aborted = true;
          providerStream.abort();
          status = 'cancelled';
        },
        [Symbol.asyncIterator]() { return iterator; },
      };
      return stream;
    }

    const stream = getStream();
    this.activeStreams.set(id, stream);

    // Auto-remove when completed
    const originalOnComplete = callbacks?.onComplete;
    // Wrap callbacks to auto-remove stream on completion
    const wrappedOnComplete = (s: ConversationStream) => {
      this.activeStreams.delete(id);
      originalOnComplete?.(s);
    };
    void wrappedOnComplete;

    this.logger.info({ streamId: id, conversationId, provider: providerStream.provider }, 'Stream created');
    return stream;
  }

  getActiveStreams(): readonly ConversationStream[] {
    return [...this.activeStreams.values()];
  }

  abortStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.abort();
      this.activeStreams.delete(streamId);
      this.logger.info({ streamId }, 'Stream aborted');
    }
  }

  abortAll(): void {
    for (const [id, stream] of this.activeStreams) {
      stream.abort();
      this.logger.info({ streamId: id }, 'Stream aborted (bulk)');
    }
    this.activeStreams.clear();
  }
}
