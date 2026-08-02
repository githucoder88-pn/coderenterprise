/**
 * Provider Platform Module
 *
 * Exports everything needed to use the AI provider system.
 */

// Core abstractions
export type {
  Provider,
  ProviderName,
  ProviderConfig,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStream,
  ProviderMetadata,
  StreamChunk,
  TokenUsage,
  Message,
  MessageContent,
  MessageRole,
  ToolDefinition,
  ToolCall,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageRequest,
  ImageResponse,
  LoadBalancingStrategy,
  LoadBalancerConfig,
  FallbackConfig,
  CircuitState,
  CircuitBreakerConfig,
  QueueConfig,
} from './types.js';

export {
  ProviderRequestSchema,
  EmbeddingRequestSchema,
  ImageRequestSchema,
} from './types.js';

// Base class and errors
export { BaseProvider, ProviderError, ProviderRateLimitError, ProviderAuthError, ProviderOverloadedError, ProviderTimeoutError } from './base-provider.js';

// Implementations
export { OpenAIProvider } from './implementations/openai.provider.js';
export { AnthropicProvider } from './implementations/anthropic.provider.js';
export { GeminiProvider } from './implementations/gemini.provider.js';
export { OpenRouterProvider } from './implementations/openrouter.provider.js';
export { OllamaProvider } from './implementations/ollama.provider.js';
export { GroqProvider } from './implementations/groq.provider.js';

// Infrastructure
export { ProviderRegistry } from './provider-registry.js';
export { ProviderRouter } from './provider-router.js';
export { createProviderPlatform, type ProviderPlatform, type ProviderPlatformConfig } from './provider-factory.js';

// Resilience
export { CircuitBreaker, CircuitBreakerRegistry } from './resilience/circuit-breaker.js';
export { RequestQueue, QueueOverflowError, QueueTimeoutError } from './resilience/request-queue.js';
export { LoadBalancer } from './resilience/load-balancer.js';
