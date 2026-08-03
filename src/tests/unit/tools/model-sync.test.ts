/**
 * Dynamic Model Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamicModelRegistry, type ModelSyncAdapter, type RawModel } from '../../../tools/registry/model-sync.js';
import { createMockLogger } from '../../helpers.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0), getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async () => 0), has: vi.fn(async () => false), ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

function createMockAdapter(provider: string, models: readonly RawModel[]): ModelSyncAdapter {
  return {
    provider,
    fetchModels: vi.fn(async () => models),
  };
}

describe('DynamicModelRegistry', () => {
  let registry: DynamicModelRegistry;
  let cache: ICacheService;

  beforeEach(() => {
    cache = createMockCache();
    registry = new DynamicModelRegistry(cache, createMockLogger());
  });

  describe('registerAdapter', () => {
    it('should register a provider adapter', async () => {
      const adapter = createMockAdapter('openai', []);
      registry.registerAdapter(adapter);
      await expect(registry.getProviders()).resolves.toContain('openai');
    });
  });

  describe('synchronize', () => {
    it('should synchronize from registered providers', async () => {
      registry.registerAdapter(createMockAdapter('openai', [
        { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutputTokens: 16384 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutputTokens: 16384 },
      ]));

      const result = await registry.synchronize();
      expect(result.added).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should normalize model IDs with provider prefix', async () => {
      registry.registerAdapter(createMockAdapter('anthropic', [
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
      ]));

      await registry.synchronize();
      const model = await registry.getModel('anthropic/claude-3-5-sonnet');
      expect(model).not.toBeNull();
      expect(model!.provider).toBe('anthropic');
      expect(model!.displayName).toBe('Claude 3.5 Sonnet');
    });

    it('should handle multiple providers', async () => {
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));
      registry.registerAdapter(createMockAdapter('anthropic', [{ id: 'claude-3', name: 'Claude 3' }]));
      registry.registerAdapter(createMockAdapter('groq', [{ id: 'llama-3.1', name: 'Llama 3.1' }]));

      const result = await registry.synchronize();
      expect(result.added).toBe(3);
      expect((await registry.getProviders()).length).toBe(3);
    });

    it('should update existing models', async () => {
      registry.registerAdapter(createMockAdapter('openai', [
        { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      ]));

      await registry.synchronize();
      const result = await registry.synchronize();
      expect(result.added).toBe(0);
    });

    it('should handle provider errors gracefully', async () => {
      const failingAdapter: ModelSyncAdapter = {
        provider: 'broken',
        fetchModels: vi.fn(async () => { throw new Error('API down'); }),
      };
      registry.registerAdapter(failingAdapter);
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));

      const result = await registry.synchronize();
      expect(result.added).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('broken');
    });

    it('should cache models after sync', async () => {
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));
      await registry.synchronize();
      expect(cache.set).toHaveBeenCalledWith('models:registry', expect.any(Array), expect.any(Number));
    });

    it('should notify listeners on sync', async () => {
      const callback = vi.fn();
      registry.onProviderUpdate('openai', callback);
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));

      await registry.synchronize();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('synchronizeProvider', () => {
    it('should sync a single provider', async () => {
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));
      registry.registerAdapter(createMockAdapter('anthropic', [{ id: 'claude-3', name: 'Claude 3' }]));

      const result = await registry.synchronizeProvider('openai');
      expect(result.added).toBe(1);

      const allModels = await registry.getModels();
      expect(allModels.length).toBe(1); // Only openai synced
    });
  });

  describe('getModels', () => {
    beforeEach(async () => {
      registry.registerAdapter(createMockAdapter('openai', [
        { id: 'gpt-4o', name: 'GPT-4o', capabilities: ['streaming', 'vision'] },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      ]));
      registry.registerAdapter(createMockAdapter('anthropic', [
        { id: 'claude-3', name: 'Claude 3', capabilities: ['streaming'] },
      ]));
      await registry.synchronize();
    });

    it('should return all models', async () => {
      const models = await registry.getModels();
      expect(models.length).toBe(3);
    });

    it('should filter by provider', async () => {
      const models = await registry.getModels({ provider: 'openai' });
      expect(models.length).toBe(2);
      expect(models.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('should filter by capability', async () => {
      const models = await registry.getModels({ capability: 'vision' });
      expect(models.length).toBe(1);
      expect(models[0]!.name).toBe('gpt-4o');
    });

    it('should filter by status', async () => {
      const models = await registry.getModels({ status: 'active' });
      expect(models.length).toBe(3);
    });
  });

  describe('search', () => {
    it('should search by name', async () => {
      registry.registerAdapter(createMockAdapter('openai', [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'dall-e-3', name: 'DALL-E 3' },
      ]));
      await registry.synchronize();

      const results = await registry.search('gpt');
      expect(results.length).toBe(1);
      expect(results[0]!.name).toBe('gpt-4o');
    });

    it('should search by provider', async () => {
      registry.registerAdapter(createMockAdapter('openai', [{ id: 'gpt-4o', name: 'GPT-4o' }]));
      await registry.synchronize();

      const results = await registry.search('openai');
      expect(results.length).toBe(1);
    });
  });

  describe('never hardcode', () => {
    it('should derive all models from adapters, not static arrays', async () => {
      // This test verifies the core principle: models come from adapters
      const adapter = createMockAdapter('custom-provider', [
        { id: 'custom-model-1', name: 'Custom Model 1' },
        { id: 'custom-model-2', name: 'Custom Model 2', deprecated: true },
      ]);
      registry.registerAdapter(adapter);
      await registry.synchronize();

      const models = await registry.getModels();
      expect(models.length).toBe(2);
      expect(models.some((m) => m.id === 'custom-provider/custom-model-1')).toBe(true);
      expect(models.some((m) => m.id === 'custom-provider/custom-model-2')).toBe(true);
    });
  });
});
