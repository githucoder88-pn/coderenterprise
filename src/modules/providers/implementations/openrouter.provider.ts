/**
 * OpenRouter Provider
 *
 * Gateway to 100+ models via OpenRouter API (OpenAI-compatible).
 */

import { BaseProvider } from '../base-provider.js';
import type {
  ProviderName,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  StreamChunk,
  ToolCall,
  TokenUsage,
} from '../types.js';
import { nanoid } from 'nanoid';

export class OpenRouterProvider extends BaseProvider {
  readonly name: ProviderName = 'openrouter';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    imageGeneration: false,
    embeddings: false,
    vision: true,
    reasoning: true,
    structuredOutput: true,
    maxContextTokens: 200_000,
    maxOutputTokens: 16_384,
    supportedModels: [
      'openai/gpt-4o', 'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet', 'anthropic/claude-3-opus',
      'google/gemini-pro-1.5', 'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-405b-instruct',
      'mistralai/mixtral-8x22b-instruct',
      'deepseek/deepseek-chat', 'deepseek/deepseek-r1',
    ],
    supportsSystemMessage: true,
    supportsFunctionCalling: true,
  };

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': 'https://coderenterprise.com',
      'X-Title': 'CODER Enterprise',
      ...this.config.headers,
    };
  }

  protected async doComplete(request: ProviderRequest): Promise<ProviderResponse> {
    const body = this.buildRequestBody(request, false);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    return this.parseResponse(data, request);
  }

  protected async doStream(request: ProviderRequest): Promise<ProviderStream> {
    const body = this.buildRequestBody(request, true);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/api/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
    }

    return this.createStream(response, request.model);
  }

  private buildRequestBody(request: ProviderRequest, stream: boolean): Record<string, unknown> {
    const messages = request.messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      return {
        role: m.role,
        content: m.content.map((c) => {
          if (c.type === 'text') return { type: 'text', text: c.text };
          if (c.type === 'image_url') return { type: 'image_url', image_url: c.image_url };
          return { type: 'text', text: '' };
        }),
      };
    });

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.stop) body.stop = request.stop;
    if (request.seed !== undefined) body.seed = request.seed;

    if (request.tools?.length) {
      body.tools = request.tools;
    }
    if (request.toolChoice) body.tool_choice = request.toolChoice;
    if (request.responseFormat) body.response_format = request.responseFormat;

    return body;
  }

  private parseResponse(data: any, request: ProviderRequest): ProviderResponse {
    const choice = data.choices?.[0];
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }));

    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    return {
      id: data.id,
      model: data.model,
      provider: 'openrouter',
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      toolCalls,
      usage,
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
            const data = line.slice(6).trim();
            if (data === '[DONE]') return { done: true, value: undefined };

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              return {
                done: false,
                value: {
                  id: parsed.id ?? streamId,
                  delta: {
                    content: delta.content ?? undefined,
                    toolCalls: delta.tool_calls,
                  },
                  finishReason: parsed.choices?.[0]?.finish_reason,
                },
              };
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
      provider: 'openrouter',
      model,
    };
  }
}
