/**
 * Ollama Provider
 *
 * Local inference server. Supports Llama, Mistral, Phi, Gemma, etc.
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
  EmbeddingRequest,
  EmbeddingResponse,
  ToolCall,
  TokenUsage,
} from '../types.js';

export class OllamaProvider extends BaseProvider {
  readonly name: ProviderName = 'ollama';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    imageGeneration: false,
    embeddings: true,
    vision: true,
    reasoning: false,
    structuredOutput: true,
    maxContextTokens: 128_000,
    maxOutputTokens: 32_768,
    supportedModels: [
      'llama3.1', 'llama3.1:8b', 'llama3.1:70b', 'llama3.1:405b',
      'llama3.2', 'llama3.2:1b', 'llama3.2:3b',
      'mistral', 'mixtral', 'phi3', 'gemma2',
      'codellama', 'deepseek-r1', 'qwen2.5',
      'command-r', 'command-r-plus',
    ],
    supportsSystemMessage: true,
    supportsFunctionCalling: true,
  };

  // No API key needed for local Ollama
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
  }

  protected async doComplete(request: ProviderRequest): Promise<ProviderResponse> {
    const body = this.buildRequestBody(request, false);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`Ollama ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    return this.parseResponse(data, request);
  }

  protected async doStream(request: ProviderRequest): Promise<ProviderStream> {
    const body = this.buildRequestBody(request, true);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`Ollama ${response.status}: ${await response.text()}`);
    }

    return this.createStream(response, request.model);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const input = Array.isArray(request.input) ? request.input[0] : request.input;

    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/embeddings`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: request.model,
          prompt: input,
        }),
      },
    );

    if (!response.ok) throw new Error(`Ollama embeddings ${response.status}`);

    const data = await response.json() as any;
    return {
      embeddings: [data.embedding ?? []],
      model: request.model,
      provider: 'ollama',
      usage: { promptTokens: 0, totalTokens: 0 },
    };
  }

  private buildRequestBody(request: ProviderRequest, stream: boolean): Record<string, unknown> {
    const messages: Record<string, unknown>[] = request.messages.map((m) => {
      const msg: Record<string, unknown> = { role: m.role };
      if (typeof m.content === 'string') {
        msg.content = m.content;
      } else {
        // For multimodal, Ollama expects images as base64 in the message
        const textParts: string[] = [];
        const images: string[] = [];
        for (const part of m.content) {
          if (part.text) textParts.push(part.text);
          if (part.image_base64) images.push(part.image_base64.data);
          if (part.image_url?.url) images.push(part.image_url.url);
        }
        msg.content = textParts.join('\n');
        if (images.length > 0) msg.images = images;
      }
      return msg;
    });

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream,
      options: {},
    };

    if (request.temperature !== undefined) (body.options as any).temperature = request.temperature;
    if (request.topP !== undefined) (body.options as any).top_p = request.topP;
    if (request.maxTokens !== undefined) (body.options as any).num_predict = request.maxTokens;
    if (request.stop) (body.options as any).stop = request.stop;
    if (request.seed !== undefined) (body.options as any).seed = request.seed;

    // Format for structured output
    if (request.responseFormat?.type === 'json_object') {
      body.format = 'json';
    }

    // Tools
    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    return body;
  }

  private parseResponse(data: any, request: ProviderRequest): ProviderResponse {
    const message = data.message ?? {};
    let content = message.content ?? '';
    const toolCalls: ToolCall[] = [];

    // Ollama returns tool calls in message.tool_calls
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        toolCalls.push({
          id: `call_${nanoid(16)}`,
          type: 'function',
          function: {
            name: tc.function?.name ?? '',
            arguments: JSON.stringify(tc.function?.arguments ?? {}),
          },
        });
      }
    }

    const usage: TokenUsage = {
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
      totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    };

    return {
      id: `ollama-${nanoid(16)}`,
      model: data.model ?? request.model,
      provider: 'ollama',
      content,
      finishReason: data.done ? 'stop' : 'length',
      toolCalls,
      usage,
      metadata: {
        ...this.createMetadata(request),
        latencyMs: data.total_duration ? data.total_duration / 1_000_000 : 0,
      },
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
          const lines = text.trim().split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              const message = data.message ?? {};

              if (data.done) {
                return {
                  done: false,
                  value: {
                    id: streamId,
                    delta: {},
                    finishReason: 'stop',
                    usage: {
                      promptTokens: data.prompt_eval_count,
                      completionTokens: data.eval_count,
                    },
                  },
                };
              }

              const chunk: StreamChunk = {
                id: streamId,
                delta: {
                  content: message.content ?? undefined,
                },
              };

              if (message.tool_calls) {
                chunk.delta.toolCalls = message.tool_calls.map((tc: any) => ({
                  function: {
                    name: tc.function?.name,
                    arguments: JSON.stringify(tc.function?.arguments ?? {}),
                  },
                }));
              }

              return { done: false, value: chunk };
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
      provider: 'ollama',
      model,
    };
  }
}
