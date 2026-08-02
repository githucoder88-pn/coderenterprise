/**
 * Provider Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../../../modules/providers/provider-registry.js';
import type { Provider, ProviderName } from '../../../modules/providers/types.js';

function createMockProvider(name: ProviderName, overrides?: Partial<Provider>): Provider {
  return {
    name,
    config: { name, apiKey: 'test', baseUrl: 'http://test', maxRetries: 3, timeout: 30000, defaultModel: 'test' },
    capabilities: {
      streaming: true,
      toolCalling: true,
      imageGeneration: name === 'openai',
      embeddings: name === 'openai' || name === 'gemini',
      vision: true,
      reasoning: name === 'anthropic',
      structuredOutput: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      supportedModels: ['model-a', 'model-b'],
      supportsSystemMessage: true,
      supportsFunctionCalling: true,
    },
    complete: async () => ({} as any),
    stream: async () => ({} as any),
    countTokens: async () => 0,
    healthCheck: async () => true,
    ...overrides,
  };
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register / get', () => {
    it('should register and retrieve a provider', () => {
      const provider = createMockProvider('openai');
      registry.register(provider);

      expect(registry.get('openai')).toBe(provider);
    });

    it('should return null for unregistered provider', () => {
      expect(registry.get('openai')).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all registered providers', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'));

      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('getHealthy', () => {
    it('should return only enabled providers', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'));

      registry.setEnabled('anthropic', false);

      const healthy = registry.getHealthy();
      expect(healthy).toHaveLength(1);
      expect(healthy[0]!.name).toBe('openai');
    });
  });

  describe('getByCapability', () => {
    it('should filter by capability', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'));
      registry.register(createMockProvider('groq'));

      const withImages = registry.getByCapability('imageGeneration');
      expect(withImages).toHaveLength(1);
      expect(withImages[0]!.name).toBe('openai');
    });

    it('should filter by embeddings', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'));

      const withEmbeddings = registry.getByCapability('embeddings');
      expect(withEmbeddings).toHaveLength(1);
    });
  });

  describe('getByModel', () => {
    it('should find providers supporting a model', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'));

      const found = registry.getByModel('model-a');
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('weight / priority', () => {
    it('should set and get weight', () => {
      registry.register(createMockProvider('openai'), { weight: 5 });
      expect(registry.getWeight('openai')).toBe(5);

      registry.setWeight('openai', 10);
      expect(registry.getWeight('openai')).toBe(10);
    });

    it('should set and get priority', () => {
      registry.register(createMockProvider('openai'), { priority: 1 });
      expect(registry.getPriority('openai')).toBe(1);
    });
  });

  describe('stats', () => {
    it('should return stats for all providers', () => {
      registry.register(createMockProvider('openai'));
      registry.register(createMockProvider('anthropic'), { weight: 3 });

      const stats = registry.getStats();
      expect(stats).toHaveLength(2);
      expect(stats.find((s) => s.name === 'openai')?.enabled).toBe(true);
      expect(stats.find((s) => s.name === 'anthropic')?.weight).toBe(3);
    });
  });

  describe('has', () => {
    it('should check if provider is registered', () => {
      registry.register(createMockProvider('openai'));
      expect(registry.has('openai')).toBe(true);
      expect(registry.has('anthropic')).toBe(false);
    });
  });
});
