/**
 * Provider Factory
 *
 * Creates and configures the complete provider platform from app config.
 */

import type { ProviderName } from './types.js';
import { ProviderRegistry } from './provider-registry.js';
import { ProviderRouter } from './provider-router.js';
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
  GroqProvider,
} from './implementations/index.js';

export interface ProviderPlatformConfig {
  readonly providers: {
    readonly openai?: { apiKey: string; baseUrl?: string };
    readonly anthropic?: { apiKey: string; baseUrl?: string };
    readonly gemini?: { apiKey: string; baseUrl?: string };
    readonly openrouter?: { apiKey: string; baseUrl?: string };
    readonly ollama?: { baseUrl?: string };
    readonly groq?: { apiKey: string; baseUrl?: string };
  };
  readonly defaultProvider: ProviderName;
  readonly fallbackOrder: readonly ProviderName[];
  readonly loadBalancing?: 'round-robin' | 'least-latency' | 'weighted-random' | 'priority';
}

export interface ProviderPlatform {
  readonly registry: ProviderRegistry;
  readonly router: ProviderRouter;
}

export function createProviderPlatform(config: ProviderPlatformConfig): ProviderPlatform {
  const registry = new ProviderRegistry();

  // Register only configured providers
  if (config.providers.openai) {
    registry.register(
      new OpenAIProvider({
        name: 'openai',
        apiKey: config.providers.openai.apiKey,
        baseUrl: config.providers.openai.baseUrl ?? 'https://api.openai.com',
        maxRetries: 3,
        timeout: 60_000,
        defaultModel: 'gpt-4o',
      }),
      { weight: 2, priority: 1 },
    );
  }

  if (config.providers.anthropic) {
    registry.register(
      new AnthropicProvider({
        name: 'anthropic',
        apiKey: config.providers.anthropic.apiKey,
        baseUrl: config.providers.anthropic.baseUrl ?? 'https://api.anthropic.com',
        maxRetries: 3,
        timeout: 60_000,
        defaultModel: 'claude-3-5-sonnet-20241022',
      }),
      { weight: 2, priority: 1 },
    );
  }

  if (config.providers.gemini) {
    registry.register(
      new GeminiProvider({
        name: 'gemini',
        apiKey: config.providers.gemini.apiKey,
        baseUrl: config.providers.gemini.baseUrl ?? 'https://generativelanguage.googleapis.com',
        maxRetries: 3,
        timeout: 60_000,
        defaultModel: 'gemini-1.5-pro',
      }),
      { weight: 1, priority: 2 },
    );
  }

  if (config.providers.openrouter) {
    registry.register(
      new OpenRouterProvider({
        name: 'openrouter',
        apiKey: config.providers.openrouter.apiKey,
        baseUrl: config.providers.openrouter.baseUrl ?? 'https://openrouter.ai',
        maxRetries: 3,
        timeout: 60_000,
        defaultModel: 'openai/gpt-4o',
      }),
      { weight: 1, priority: 3 },
    );
  }

  if (config.providers.ollama) {
    registry.register(
      new OllamaProvider({
        name: 'ollama',
        apiKey: '',
        baseUrl: config.providers.ollama.baseUrl ?? 'http://localhost:11434',
        maxRetries: 2,
        timeout: 120_000,
        defaultModel: 'llama3.1',
      }),
      { weight: 1, priority: 4 },
    );
  }

  if (config.providers.groq) {
    registry.register(
      new GroqProvider({
        name: 'groq',
        apiKey: config.providers.groq.apiKey,
        baseUrl: config.providers.groq.baseUrl ?? 'https://api.groq.com',
        maxRetries: 3,
        timeout: 30_000,
        defaultModel: 'llama-3.1-70b-versatile',
      }),
      { weight: 1, priority: 2 },
    );
  }

  const router = new ProviderRouter(registry, {
    fallback: {
      enabled: true,
      maxAttempts: config.fallbackOrder.length,
      providerOrder: config.fallbackOrder,
      retryOnCodes: ['RATE_LIMIT', 'OVERLOADED', 'TIMEOUT'],
    },
    loadBalancer: {
      strategy: config.loadBalancing ?? 'least-latency',
    },
    defaultProvider: config.defaultProvider,
  });

  return { registry, router };
}
