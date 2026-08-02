/**
 * Provider Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderRouter } from '../../../modules/providers/provider-router.js';
import { ProviderRegistry } from '../../../modules/providers/provider-registry.js';
import type { Provider, ProviderName, ProviderResponse } from '../../../modules/providers/types.js';

function createMockProvider(name: ProviderName, opts?: { fail?: boolean; delay?: number }): Provider {
  return {
    name,
    config: { name, apiKey: 'test', baseUrl: 'http://test', maxRetries: 1, timeout: 30000, defaultModel: 'test' },
    capabilities: {
      streaming: true,
      toolCalling: true,
      imageGeneration: name === 'openai',
      embeddings: name === 'openai',
      vision: true,
      reasoning: false,
      structuredOutput: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      supportedModels: ['test-model', 'gpt-4o'],
      supportsSystemMessage: true,
      supportsFunctionCalling: true,
    },
    complete: vi.fn(async () => {
      if (opts?.fail) throw new Error(`${name} failed`);
      if (opts?.delay) await new Promise((r) => setTimeout(r, opts.delay));
      return {
        id: `${name}-resp`,
        model: 'test-model',
        provider: name,
        content: `Response from ${name}`,
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        metadata: {
          requestId: 'req-1',
          provider: name,
          model: 'test-model',
          latencyMs: 50,
          attempt: 1,
          cached: false,
          timestamp: new Date(),
        },
      } satisfies ProviderResponse;
    }),
    stream: vi.fn(async () => ({} as any)),
    embed: vi.fn(async () => ({
      embeddings: [[0.1, 0.2, 0.3]],
      model: 'test-model',
      provider: name,
      usage: { promptTokens: 10, totalTokens: 10 },
    })),
    generateImage: vi.fn(async () => ({
      images: [{ url: 'http://test/image.png' }],
      model: 'dall-e-3',
      provider: name,
    })),
    countTokens: vi.fn(async () => 42),
    healthCheck: vi.fn(async () => true),
  };
}

describe('ProviderRouter', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  function createRouter(
    overrides?: Partial<{
      defaultProvider: ProviderName;
      fallbackOrder: readonly ProviderName[];
    }>,
  ) {
    return new ProviderRouter(registry, {
      fallback: {
        enabled: true,
        maxAttempts: 3,
        providerOrder: overrides?.fallbackOrder ?? ['openai', 'anthropic', 'groq'],
      },
      loadBalancer: { strategy: 'round-robin' },
      defaultProvider: overrides?.defaultProvider ?? 'openai',
    });
  }

  describe('complete', () => {
    it('should route to default provider', async () => {
      const openai = createMockProvider('openai');
      registry.register(openai);

      const router = createRouter();
      const result = await router.complete({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.provider).toBe('openai');
      expect(result.content).toBe('Response from openai');
    });

    it('should fallback to next provider on failure', async () => {
      const openai = createMockProvider('openai', { fail: true });
      const anthropic = createMockProvider('anthropic');
      registry.register(openai);
      registry.register(anthropic);

      const router = createRouter();
      const result = await router.complete({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.provider).toBe('anthropic');
      expect(result.content).toBe('Response from anthropic');
    });

    it('should use preferred provider when specified', async () => {
      const openai = createMockProvider('openai');
      const anthropic = createMockProvider('anthropic');
      registry.register(openai);
      registry.register(anthropic);

      const router = createRouter();
      const result = await router.complete(
        { model: 'test-model', messages: [{ role: 'user', content: 'Hello' }] },
        'anthropic',
      );

      expect(result.provider).toBe('anthropic');
    });

    it('should track stats', async () => {
      registry.register(createMockProvider('openai'));
      const router = createRouter();

      await router.complete({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const stats = router.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.providerBreakdown['openai']?.requests).toBe(1);
    });
  });

  describe('embed', () => {
    it('should route to provider with embeddings capability', async () => {
      const openai = createMockProvider('openai');
      registry.register(openai);

      const router = createRouter();
      const result = await router.embed({
        model: 'text-embedding-3-small',
        input: 'Hello world',
      });

      expect(result.embeddings).toHaveLength(1);
    });
  });

  describe('countTokens', () => {
    it('should delegate to provider', async () => {
      const openai = createMockProvider('openai');
      registry.register(openai);

      const router = createRouter();
      const count = await router.countTokens('test-model', [
        { role: 'user', content: 'Hello' },
      ]);

      expect(count).toBe(42);
    });
  });

  describe('fallback exhaustion', () => {
    it('should throw when all providers fail', async () => {
      registry.register(createMockProvider('openai', { fail: true }));
      registry.register(createMockProvider('anthropic', { fail: true }));

      const router = createRouter();

      await expect(
        router.complete({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow();
    });
  });
});
