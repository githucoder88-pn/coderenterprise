/**
 * Anthropic Provider
 *
 * Supports: Claude 3.5 Sonnet, Claude 3 Opus/Haiku, vision, tool use, streaming
 */

import { nanoid } from 'nanoid';
import { BaseProvider } from '../base-provider.js';
import type {
  ProviderName,
  ProviderConfig,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  StreamChunk,
  ToolCall,
  TokenUsage,
  Message,
  MessageContent,
} from '../types.js';

export class AnthropicProvider extends BaseProvider {
  readonly name: ProviderName = 'anthropic';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    imageGeneration: false,
    embeddings: false,
    vision: true,
    reasoning: true,
    structuredOutput: false,
    maxContextTokens: 200_000,
    maxOutputTokens: 8_192,
    supportedModels: [
      'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-20241022', 'claude-3-5-haiku-latest',
      'claude-3-opus-20240229', 'claude-3-opus-latest',
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
    ],
    supportsSystemMessage: true,
    supportsFunctionCalling: true,
  };

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      ...this.config.headers,
    };
  }

  protected async doComplete(request: ProviderRequest): Promise<ProviderResponse> {
    const body = this.buildRequestBody(request, false);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic ${response.status}: ${error}`);
    }

    const data = await response.json() as any;
    return this.parseResponse(data, request);
  }

  protected async doStream(request: ProviderRequest): Promise<ProviderStream> {
    const body = this.buildRequestBody(request, true);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic ${response.status}: ${error}`);
    }

    return this.createStream(response, request.model);
  }

  async countTokens(_model: string, messages: readonly Message[]): Promise<number> {
    // Anthropic's tokenizer ≈ 3.5 chars/token
    let totalChars = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else {
        for (const part of msg.content) {
          if (part.text) totalChars += part.text.length;
          if (part.image_base64) totalChars += 1600; // image token estimate
        }
      }
      totalChars += 4;
    }
    return Math.ceil(totalChars / 3.5);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildRequestBody(request: ProviderRequest, stream: boolean): Record<string, unknown> {
    // Anthropic separates system from messages
    let systemPrompt: string | undefined;
    const messages: Record<string, unknown>[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt = typeof msg.content === 'string' ? msg.content : msg.content.map((c) => c.text ?? '').join('');
      } else {
        messages.push(this.mapMessage(msg));
      }
    }

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream,
      max_tokens: request.maxTokens ?? 4096,
    };

    if (systemPrompt) body.system = systemPrompt;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stop) body.stop_sequences = [...request.stop];

    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    if (request.toolChoice) {
      if (request.toolChoice === 'auto') {
        body.tool_choice = { type: 'auto' };
      } else if (request.toolChoice === 'none') {
        body.tool_choice = { type: 'none' };
      } else if (request.toolChoice === 'required') {
        body.tool_choice = { type: 'any' };
      } else if (typeof request.toolChoice === 'object') {
        body.tool_choice = { type: 'tool', name: request.toolChoice.function.name };
      }
    }

    return body;
  }

  private mapMessage(msg: Message): Record<string, unknown> {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }

    const content = msg.content.map((c: MessageContent) => {
      switch (c.type) {
        case 'text':
          return { type: 'text', text: c.text };
        case 'image_base64':
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: c.image_base64!.media_type,
              data: c.image_base64!.data,
            },
          };
        case 'tool_use':
          return {
            type: 'tool_use',
            id: c.tool_use!.id,
            name: c.tool_use!.name,
            input: c.tool_use!.input,
          };
        case 'tool_result':
          return {
            type: 'tool_result',
            tool_use_id: c.tool_result!.tool_use_id,
            content: c.tool_result!.content,
          };
        default:
          return { type: 'text', text: '' };
      }
    });

    return { role: msg.role, content };
  }

  private parseResponse(data: any, request: ProviderRequest): ProviderResponse {
    let content = '';
    let reasoning = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content ?? []) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'thinking') {
        reasoning += block.thinking;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    const usage: TokenUsage = {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      cachedTokens: data.usage?.cache_read_input_tokens,
    };

    return {
      id: data.id,
      model: data.model,
      provider: 'anthropic',
      content,
      finishReason: this.mapStopReason(data.stop_reason),
      toolCalls,
      usage,
      reasoning: reasoning || undefined,
      metadata: this.createMetadata(request),
    };
  }

  private createStream(response: Response, model: string): ProviderStream {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const streamId = `stream-${nanoid()}`;
    let aborted = false;

    const iterator: AsyncIterator<StreamChunk> = {
      async next(): Promise<IteratorResult<StreamChunk>> {
        if (aborted || !reader) return { done: true, value: undefined };

        while (true) {
          const { done, value } = await reader.read();
          if (done) return { done: true, value: undefined };

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content_block_delta') {
                if (data.delta?.type === 'text_delta') {
                  return {
                    done: false,
                    value: {
                      id: streamId,
                      delta: { content: data.delta.text },
                    },
                  };
                }
                if (data.delta?.type === 'thinking_delta') {
                  return {
                    done: false,
                    value: {
                      id: streamId,
                      delta: { reasoning: data.delta.thinking },
                    },
                  };
                }
                if (data.delta?.type === 'input_json_delta') {
                  return {
                    done: false,
                    value: {
                      id: streamId,
                      delta: {
                        toolCalls: [{
                          function: { arguments: data.delta.partial_json },
                        }],
                      },
                    },
                  };
                }
              }

              if (data.type === 'message_delta') {
                return {
                  done: false,
                  value: {
                    id: streamId,
                    delta: {},
                    finishReason: data.delta?.stop_reason === 'end_turn' ? 'stop' : 'tool_calls',
                    usage: data.usage ? {
                      completionTokens: data.usage.output_tokens,
                    } : undefined,
                  },
                };
              }

              if (data.type === 'message_start') {
                return {
                  done: false,
                  value: {
                    id: data.message?.id ?? streamId,
                    delta: { role: 'assistant' },
                    usage: data.message?.usage ? {
                      promptTokens: data.message.usage.input_tokens,
                    } : undefined,
                  },
                };
              }
            } catch {
              continue;
            }
          }
        }
      },
    };

    return {
      [Symbol.asyncIterator]() { return iterator; },
      abort() { aborted = true; reader?.cancel(); },
      id: streamId,
      provider: 'anthropic',
      model,
    };
  }

  private mapStopReason(reason: string | undefined): ProviderResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'stop_sequence': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      default: return 'stop';
    }
  }
}
