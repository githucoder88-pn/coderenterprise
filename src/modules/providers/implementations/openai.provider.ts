/**
 * OpenAI Provider
 *
 * Supports: GPT-4o, GPT-4, GPT-3.5, DALL-E, embeddings, function calling, vision
 */

import { nanoid } from 'nanoid';
import { BaseProvider } from '../base-provider.js';
import type {
  ProviderName,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  StreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageRequest,
  ImageResponse,
  ToolCall,
  TokenUsage,
  Message,
  MessageContent,
} from '../types.js';

export class OpenAIProvider extends BaseProvider {
  readonly name: ProviderName = 'openai';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    imageGeneration: true,
    embeddings: true,
    vision: true,
    reasoning: true,
    structuredOutput: true,
    maxContextTokens: 128_000,
    maxOutputTokens: 16_384,
    supportedModels: [
      'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06',
      'gpt-4-turbo', 'gpt-4-turbo-preview',
      'gpt-4', 'gpt-3.5-turbo',
      'o1', 'o1-mini', 'o1-preview',
      'o3-mini',
    ],
    supportedImageSizes: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
    supportsSystemMessage: true,
    supportsFunctionCalling: true,
  };

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
      ...this.config.headers,
    };
  }

  protected async doComplete(request: ProviderRequest): Promise<ProviderResponse> {
    const body = this.buildRequestBody(request, false);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI ${response.status}: ${error}`);
    }

    const data = await response.json() as any;
    return this.parseResponse(data, request);
  }

  protected async doStream(request: ProviderRequest): Promise<ProviderStream> {
    const body = this.buildRequestBody(request, true);
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI ${response.status}: ${error}`);
    }

    return this.createStream(response, request.model);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/embeddings`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: request.model,
          input: request.input,
          dimensions: request.dimensions,
          user: request.user,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI embeddings ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    return {
      embeddings: data.data.map((d: any) => d.embedding),
      model: data.model,
      provider: 'openai',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async generateImage(request: ImageRequest): Promise<ImageResponse> {
    const response = await this.fetchWithTimeout(
      `${this.config.baseUrl}/v1/images/generations`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: request.model || 'dall-e-3',
          prompt: request.prompt,
          n: request.n ?? 1,
          size: request.size ?? '1024x1024',
          quality: request.quality ?? 'standard',
          style: request.style ?? 'vivid',
          response_format: request.responseFormat ?? 'url',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI images ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    return {
      images: data.data.map((d: any) => ({
        url: d.url,
        b64Json: d.b64_json,
        revisedPrompt: d.revised_prompt,
      })),
      model: data.model ?? request.model,
      provider: 'openai',
    };
  }

  async countTokens(_model: string, messages: readonly Message[]): Promise<number> {
    // Improved estimate: cl100k_base ≈ 3.5 chars/token for English
    let totalChars = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else {
        for (const part of msg.content) {
          if (part.text) totalChars += part.text.length;
          if (part.image_url) totalChars += 85; // base image token cost
        }
      }
      totalChars += 4; // role/formatting overhead
    }
    return Math.ceil(totalChars / 3.5);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildRequestBody(request: ProviderRequest, stream: boolean): Record<string, unknown> {
    const messages = request.messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content, ...(m.name ? { name: m.name } : {}) };
      }
      return {
        role: m.role,
        content: m.content.map((c) => this.mapContent(c)),
        ...(m.name ? { name: m.name } : {}),
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
    if (request.user) body.user = request.user;

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

    if (request.toolChoice !== undefined) {
      if (typeof request.toolChoice === 'string') {
        body.tool_choice = request.toolChoice;
      } else {
        body.tool_choice = {
          type: 'function',
          function: { name: request.toolChoice.function.name },
        };
      }
    }

    if (request.responseFormat) {
      body.response_format = request.responseFormat;
    }

    // Reasoning model support (o1, o3)
    if (request.model.startsWith('o1') || request.model.startsWith('o3')) {
      // o1 models use max_completion_tokens instead of max_tokens
      if (body.max_tokens !== undefined) {
        body.max_completion_tokens = body.max_tokens;
        delete body.max_tokens;
      }
      // o1 doesn't support temperature
      delete body.temperature;
    }

    return body;
  }

  private mapContent(content: MessageContent): Record<string, unknown> {
    switch (content.type) {
      case 'text':
        return { type: 'text', text: content.text };
      case 'image_url':
        return { type: 'image_url', image_url: content.image_url };
      case 'image_base64':
        return {
          type: 'image_url',
          image_url: {
            url: `data:${content.image_base64!.media_type};base64,${content.image_base64!.data}`,
          },
        };
      case 'tool_use':
        return {
          type: 'function',
          function: {
            name: content.tool_use!.name,
            arguments: JSON.stringify(content.tool_use!.input),
          },
        };
      case 'tool_result':
        return {
          role: 'tool' as const,
          tool_call_id: content.tool_result!.tool_use_id,
          content: content.tool_result!.content,
        };
      default:
        return { type: 'text', text: '' };
    }
  }

  private parseResponse(data: any, request: ProviderRequest): ProviderResponse {
    const choice = data.choices?.[0];
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
      cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
      reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
    };

    return {
      id: data.id,
      model: data.model,
      provider: 'openai',
      content: choice?.message?.content ?? '',
      finishReason: this.mapFinishReason(choice?.finish_reason),
      toolCalls,
      usage,
      reasoning: choice?.message?.reasoning_content ?? undefined,
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
        if (aborted || !reader) {
          return { done: true, value: undefined };
        }

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
                    role: delta.role as any,
                    content: delta.content ?? undefined,
                    toolCalls: delta.tool_calls?.map((tc: any) => ({
                      id: tc.id,
                      index: tc.index,
                      type: 'function' as const,
                      function: tc.function,
                    })),
                  },
                  finishReason: parsed.choices?.[0]?.finish_reason ?? undefined,
                  usage: parsed.usage ? {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens,
                  } : undefined,
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
      abort() {
        aborted = true;
        reader?.cancel();
      },
      id: streamId,
      provider: 'openai',
      model,
    };
  }

  private mapFinishReason(reason: string | undefined): ProviderResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_calls';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
}
