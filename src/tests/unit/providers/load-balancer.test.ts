/**
 * Load Balancer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer } from '../../../modules/providers/resilience/load-balancer.js';
import type { Provider, ProviderName, ProviderCapabilities, ProviderConfig } from '../../../modules/providers/types.js';

function createMockProvider(name: ProviderName): Provider {
  return {
    name,
    config: { name, apiKey: '', baseUrl: '', maxRetries: 3, timeout: 30000, defaultModel: 'test' },
    capabilities: {
      streaming: true,
      toolCalling: true,
      imageGeneration: false,
      embeddings: false,
      vision: false,
      reasoning: false,
      structuredOutput: false,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      supportedModels: ['test'],
      supportsSystemMessage: true,
      supportsFunctionCalling: true,
    },
    complete: async () => ({} as any),
    stream: async () => ({} as any),
    countTokens: async () => 0,
    healthCheck: async () => true,
  };
}

describe('LoadBalancer', () => {
  const providers: Provider[] = [
    createMockProvider('openai'),
    createMockProvider('anthropic'),
    createMockProvider('groq'),
  ];

  describe('round-robin', () => {
    it('should cycle through providers', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin' });
      const results = [
        lb.select(providers)!.name,
        lb.select(providers)!.name,
        lb.select(providers)!.name,
        lb.select(providers)!.name,
      ];

      expect(results).toEqual(['openai', 'anthropic', 'groq', 'openai']);
    });
  });

  describe('least-latency', () => {
    it('should prefer provider with no data', () => {
      const lb = new LoadBalancer({ strategy: 'least-latency' });
      const selected = lb.select(providers);
      // With no data, it picks the first one (optimistic)
      expect(selected).toBeDefined();
    });

    it('should prefer provider with lower latency', () => {
      const lb = new LoadBalancer({ strategy: 'least-latency' });
      lb.recordLatency('openai', 500);
      lb.recordLatency('anthropic', 100);
      lb.recordLatency('groq', 300);

      const selected = lb.select(providers);
      expect(selected!.name).toBe('anthropic');
    });
  });

  describe('weighted-random', () => {
    it('should respect weights approximately', () => {
      const lb = new LoadBalancer({
        strategy: 'weighted-random',
        weights: { openai: 10, anthropic: 0, groq: 0 },
      });

      const results = new Set<string>();
      for (let i = 0; i < 50; i++) {
        results.add(lb.select(providers)!.name);
      }

      // With weight 10 vs 0, should almost always pick openai
      expect(results.has('openai')).toBe(true);
    });
  });

  describe('priority', () => {
    it('should prefer highest priority provider', () => {
      const lb = new LoadBalancer({
        strategy: 'priority',
        priorities: ['groq', 'anthropic', 'openai'],
      });

      const selected = lb.select(providers);
      expect(selected!.name).toBe('groq');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty providers', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin' });
      expect(lb.select([])).toBeNull();
    });

    it('should return single provider directly', () => {
      const lb = new LoadBalancer({ strategy: 'round-robin' });
      const single = [providers[0]!];
      expect(lb.select(single)!.name).toBe('openai');
    });
  });

  describe('latency stats', () => {
    it('should track and sort latency stats', () => {
      const lb = new LoadBalancer({ strategy: 'least-latency' });
      lb.recordLatency('openai', 200);
      lb.recordLatency('openai', 300);
      lb.recordLatency('anthropic', 50);

      const stats = lb.getLatencyStats();
      expect(stats[0]!.provider).toBe('anthropic');
      expect(stats[0]!.avgLatencyMs).toBe(50);
      expect(stats[1]!.avgLatencyMs).toBe(250);
    });
  });
});
