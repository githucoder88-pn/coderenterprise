/**
 * Google Gemini Provider
 *
 * Supports: Gemini 1.5 Pro/Flash, vision, embeddings, tool calling
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
  MessageContent,
} from '../types.js';

export class GeminiProvider extends BaseProvider {
  readonly name: ProviderName = 'gemini';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    imageGeneration: true,
    embeddings: true,
    vision: true,
    reasoning: true,
    structuredOutput: true,
    maxContextTokens: 1_000_000,
    maxOutputTokens: 8_192,
    supportedModels: [
      'gemini-1.5-pro', 'gemini-1.5-pro-latest',
      'gemini-1.5-flash', 'gemini-1.5-flash-latest',
      'gemini-2.0-flash', 'gemini-2.0-flash-lite',
      'gemini-pro', 'gemini-pro-vision',
    ],
    supportsSystemMessage: true,
    supportsFunctionCalling: true,
  };

  protected async doComplete(request: ProviderRequest): Promise<ProviderResponse> {
    const url = `${this.config.baseUrl}/v1beta/models/${request.model}:generateContent?key=${this.config.apiKey}`;
    const body = this.buildRequestBody(request);

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    return this.parseResponse(data, request);
  }

  protected async doStream(request: ProviderRequest): Promise<ProviderStream> {
    const url = `${this.config.baseUrl}/v1beta/models/${request.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;
    const body = this.buildRequestBody(request);

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    return this.createStream(response, request.model);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || 'text-embedding-004';
    const url = `${this.config.baseUrl}/v1beta/models/${model}:embedContent?key=${this.config.apiKey}`;
    const input = Array.isArray(request.input) ? request.input[0] : request.input;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        content: { parts: [{ text: input }] },
      }),
    });

    if (!response.ok) throw new Error(`Gemini embeddings ${response.status}`);

    const data = await response.json() as any;
    return {
      embeddings: [data.embedding?.values ?? []],
      model,
      provider: 'gemini',
      usage: { promptTokens: 0, totalTokens: 0 },
    };
  }

  async generateImage(request: ImageRequest): Promise<ImageResponse> {
    // Gemini uses Imagen for image generation
    const url = `${this.config.baseUrl}/v1beta/models/imagen-3.0-generate-002:predict?key=${this.config.apiKey}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: request.prompt }],
        parameters: {
          sampleCount: request.n ?? 1,
          aspectRatio: request.size === '1792x1024' ? '16:9' : '1:1',
        },
      }),
    });

    if (!response.ok) throw new Error(`Gemini images ${response.status}`);

    const data = await response.json() as any;
    return {
      images: (data.predictions ?? []).map((p: any) => ({
        b64Json: p.bytesBase64Encoded,
      })),
      model: 'imagen-3.0-generate-002',
      provider: 'gemini',
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildRequestBody(request: ProviderRequest): Record<string, unknown> {
    const contents: Record<string, unknown>[] = [];
    let systemInstruction: Record<string, unknown> | undefined;

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: typeof msg.content === 'string' ? msg.content : msg.content.map((c) => c.text ?? '').join('') }],
        };
        continue;
      }

      const parts: Record<string, unknown>[] = [];
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else {
        for (const c of msg.content) {
          parts.push(this.mapContentPart(c));
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    const body: Record<string, unknown> = { contents };

    if (systemInstruction) body.systemInstruction = systemInstruction;

    const genConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) genConfig.temperature = request.temperature;
    if (request.topP !== undefined) genConfig.topP = request.topP;
    if (request.maxTokens !== undefined) genConfig.maxOutputTokens = request.maxTokens;
    if (request.stop) genConfig.stopSequences = [...request.stop];
    if (request.responseFormat?.type === 'json_object') {
      genConfig.responseMimeType = 'application/json';
    }

    if (Object.keys(genConfig).length > 0) {
      body.generationConfig = genConfig;
    }

    if (request.tools?.length) {
      body.tools = [{
        functionDeclarations: request.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      }];
    }

    return body;
  }

  private mapContentPart(content: MessageContent): Record<string, unknown> {
    switch (content.type) {
      case 'text':
        return { text: content.text };
      case 'image_base64':
        return {
          inlineData: {
            mimeType: content.image_base64!.media_type,
            data: content.image_base64!.data,
          },
        };
      case 'tool_use':
        return {
          functionCall: {
            name: content.tool_use!.name,
            args: content.tool_use!.input,
          },
        };
      case 'tool_result':
        return {
          functionResponse: {
            name: content.tool_result!.tool_use_id,
            response: { result: content.tool_result!.content },
          },
        };
      default:
        return { text: '' };
    }
  }

  private parseResponse(data: any, request: ProviderRequest): ProviderResponse {
    const candidate = data.candidates?.[0];
    let content = '';
    let reasoning = '';
    const toolCalls: ToolCall[] = [];

    for (const part of candidate?.content?.parts ?? []) {
      if (part.text) content += part.text;
      if (part.thought) reasoning += part.thought;
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${nanoid(16)}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args ?? {}),
          },
        });
      }
    }

    const usage: TokenUsage = {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    };

    return {
      id: `gemini-${nanoid(16)}`,
      model: request.model,
      provider: 'gemini',
      content,
      finishReason: this.mapFinishReason(candidate?.finishReason),
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
              const part = data.candidates?.[0]?.content?.parts?.[0];

              if (part?.text) {
                return {
                  done: false,
                  value: {
                    id: streamId,
                    delta: { content: part.text },
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
      provider: 'gemini',
      model,
    };
  }

  private mapFinishReason(reason: string | undefined): ProviderResponse['finishReason'] {
    switch (reason) {
      case 'STOP': return 'stop';
      case 'MAX_TOKENS': return 'length';
      case 'SAFETY': return 'content_filter';
      default: return 'stop';
    }
  }
}
