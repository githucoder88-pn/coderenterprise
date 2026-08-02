/**
 * Provider Platform — Type Definitions
 *
 * Every provider implements these interfaces. Fully swappable.
 */

import { z } from 'zod';

// ─── Provider Identity ───────────────────────────────────────────────────────

export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'ollama'
  | 'groq';

export interface ProviderConfig {
  readonly name: ProviderName;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly maxRetries: number;
  readonly timeout: number;
  readonly defaultModel: string;
  readonly headers?: Record<string, string>;
  readonly organization?: string;
}

// ─── Capabilities ────────────────────────────────────────────────────────────

export interface ProviderCapabilities {
  readonly streaming: boolean;
  readonly toolCalling: boolean;
  readonly imageGeneration: boolean;
  readonly embeddings: boolean;
  readonly vision: boolean;
  readonly reasoning: boolean;
  readonly structuredOutput: boolean;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
  readonly supportedModels: readonly string[];
  readonly supportedImageSizes?: readonly string[];
  readonly supportsSystemMessage: boolean;
  readonly supportsFunctionCalling: boolean;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageContent {
  readonly type: 'text' | 'image_url' | 'image_base64' | 'tool_use' | 'tool_result';
  readonly text?: string;
  readonly image_url?: { readonly url: string; readonly detail?: 'low' | 'high' | 'auto' };
  readonly image_base64?: { readonly media_type: string; readonly data: string };
  readonly tool_use?: { readonly id: string; readonly name: string; readonly input: unknown };
  readonly tool_result?: { readonly tool_use_id: string; readonly content: string };
}

export interface Message {
  readonly role: MessageRole;
  readonly content: string | readonly MessageContent[];
  readonly name?: string;
  readonly tool_call_id?: string;
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

// ─── Request ─────────────────────────────────────────────────────────────────

export interface ProviderRequest {
  readonly model: string;
  readonly messages: readonly Message[];
  readonly temperature?: number;
  readonly topP?: number;
  readonly maxTokens?: number;
  readonly stop?: readonly string[];
  readonly stream?: boolean;
  readonly tools?: readonly ToolDefinition[];
  readonly toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  readonly responseFormat?: { readonly type: 'json_object' | 'json_schema'; readonly schema?: Record<string, unknown> };
  readonly seed?: number;
  readonly user?: string;
  readonly metadata?: Record<string, unknown>;
  // Provider-specific passthrough
  readonly providerOptions?: Record<string, unknown>;
}

// ─── Token Usage ─────────────────────────────────────────────────────────────

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens?: number;
  readonly reasoningTokens?: number;
}

// ─── Response ────────────────────────────────────────────────────────────────

export interface ProviderResponse {
  readonly id: string;
  readonly model: string;
  readonly provider: ProviderName;
  readonly content: string;
  readonly finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  readonly toolCalls: readonly ToolCall[];
  readonly usage: TokenUsage;
  readonly reasoning?: string;
  readonly metadata: ProviderMetadata;
}

export interface ProviderMetadata {
  readonly requestId: string;
  readonly provider: ProviderName;
  readonly model: string;
  readonly latencyMs: number;
  readonly attempt: number;
  readonly cached: boolean;
  readonly timestamp: Date;
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export interface StreamChunk {
  readonly id: string;
  readonly delta: {
    readonly role?: MessageRole;
    readonly content?: string;
    readonly toolCalls?: readonly Partial<ToolCall>[];
    readonly reasoning?: string;
  };
  readonly finishReason?: ProviderResponse['finishReason'];
  readonly usage?: Partial<TokenUsage>;
}

export interface ProviderStream {
  readonly [Symbol.asyncIterator](): AsyncIterator<StreamChunk>;
  abort(): void;
  readonly id: string;
  readonly provider: ProviderName;
  readonly model: string;
}

// ─── Embeddings ──────────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  readonly model: string;
  readonly input: string | readonly string[];
  readonly dimensions?: number;
  readonly user?: string;
}

export interface EmbeddingResponse {
  readonly embeddings: readonly (readonly number[])[];
  readonly model: string;
  readonly provider: ProviderName;
  readonly usage: {
    readonly promptTokens: number;
    readonly totalTokens: number;
  };
}

// ─── Image Generation ────────────────────────────────────────────────────────

export interface ImageRequest {
  readonly model: string;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly size?: string;
  readonly quality?: 'standard' | 'hd';
  readonly style?: 'vivid' | 'natural';
  readonly n?: number;
  readonly responseFormat?: 'url' | 'b64_json';
}

export interface ImageResponse {
  readonly images: readonly { readonly url?: string; readonly b64Json?: string; readonly revisedPrompt?: string }[];
  readonly model: string;
  readonly provider: ProviderName;
}

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface Provider {
  readonly name: ProviderName;
  readonly config: ProviderConfig;
  readonly capabilities: ProviderCapabilities;

  /** Send a completion request */
  complete(request: ProviderRequest): Promise<ProviderResponse>;

  /** Send a streaming completion request */
  stream(request: ProviderRequest): Promise<ProviderStream>;

  /** Generate embeddings */
  embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /** Generate images */
  generateImage?(request: ImageRequest): Promise<ImageResponse>;

  /** Count tokens for the given messages */
  countTokens(model: string, messages: readonly Message[]): Promise<number>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly recoveryTimeoutMs: number;
  readonly halfOpenMaxCalls: number;
  readonly monitoringWindowMs: number;
}

// ─── Load Balancer ───────────────────────────────────────────────────────────

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-latency'
  | 'weighted-random'
  | 'priority';

export interface LoadBalancerConfig {
  readonly strategy: LoadBalancingStrategy;
  readonly weights?: Record<ProviderName, number>;
  readonly priorities?: readonly ProviderName[];
}

// ─── Fallback ────────────────────────────────────────────────────────────────

export interface FallbackConfig {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly providerOrder: readonly ProviderName[];
  readonly retryOnCodes?: readonly string[];
}

// ─── Request Queue ───────────────────────────────────────────────────────────

export interface QueueConfig {
  readonly maxSize: number;
  readonly concurrency: number;
  readonly timeoutMs: number;
}

// ─── Schemas for validation ──────────────────────────────────────────────────

export const ProviderRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.union([z.string(), z.array(z.any())]),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.any()).optional(),
  toolChoice: z.any().optional(),
  responseFormat: z.any().optional(),
  seed: z.number().int().optional(),
  user: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  providerOptions: z.record(z.unknown()).optional(),
});

export const EmbeddingRequestSchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string()).min(1)]),
  dimensions: z.number().int().positive().optional(),
  user: z.string().optional(),
});

export const ImageRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  size: z.string().optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  n: z.number().int().min(1).max(10).optional(),
  responseFormat: z.enum(['url', 'b64_json']).optional(),
});
