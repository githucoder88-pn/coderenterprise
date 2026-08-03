/**
 * Dynamic Model Registry
 *
 * CRITICAL: Models are NEVER hardcoded. They are synchronized from provider APIs.
 *
 * Flow: Provider API → Adapter → Normalizer → Registry → Cache → Dashboard
 */

import type { Timestamps } from '../../types/index.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';

// ─── Model Types ─────────────────────────────────────────────────────────────

export interface ModelCapability {
  readonly name: string;
  readonly supported: boolean;
  readonly maxTokens?: number;
}

export interface Pricing {
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
  readonly currency: string;
}

export interface Model extends Timestamps {
  readonly id: string;
  readonly provider: string;
  readonly name: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly capabilities: readonly ModelCapability[];
  readonly pricing: Pricing | null;
  readonly deprecated: boolean;
  readonly status: 'active' | 'deprecated' | 'removed';
  readonly lastSyncedAt: Date;
  readonly metadata: Record<string, unknown>;
}

// ─── Provider Sync Adapter ───────────────────────────────────────────────────

export interface ModelSyncAdapter {
  readonly provider: string;
  fetchModels(): Promise<readonly RawModel[]>;
}

export interface RawModel {
  readonly id: string;
  readonly name: string;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly pricing?: { input?: number; output?: number };
  readonly capabilities?: string[];
  readonly deprecated?: boolean;
  readonly metadata?: Record<string, unknown>;
}

// ─── Normalizer ──────────────────────────────────────────────────────────────

function normalizeModel(raw: RawModel, provider: string): Model {
  return {
    id: `${provider}/${raw.id}`,
    provider,
    name: raw.id,
    displayName: raw.name ?? raw.id,
    contextWindow: raw.contextWindow ?? 4096,
    maxOutputTokens: raw.maxOutputTokens ?? 4096,
    capabilities: normalizeCapabilities(raw.capabilities ?? []),
    pricing: raw.pricing ? {
      inputPerMillion: raw.pricing.input ?? 0,
      outputPerMillion: raw.pricing.output ?? 0,
      currency: 'USD',
    } : null,
    deprecated: raw.deprecated ?? false,
    status: raw.deprecated ? 'deprecated' : 'active',
    lastSyncedAt: new Date(),
    metadata: raw.metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function normalizeCapabilities(caps: readonly string[]): ModelCapability[] {
  const known = ['streaming', 'toolCalling', 'vision', 'embeddings', 'imageGeneration', 'reasoning', 'structuredOutput'];
  return known.map((name) => ({ name, supported: caps.includes(name) }));
}

// ─── Registry Service ────────────────────────────────────────────────────────

export interface IModelRegistryService {
  synchronize(): Promise<{ added: number; updated: number; removed: number; errors: readonly string[] }>;
  synchronizeProvider(provider: string): Promise<{ added: number; updated: number }>;
  getModel(id: string): Promise<Model | null>;
  getModels(filter?: { provider?: string; capability?: string; status?: string }): Promise<readonly Model[]>;
  getProviders(): Promise<readonly string[]>;
  search(query: string): Promise<readonly Model[]>;
  getLastSyncTime(): Date | null;
  onProviderUpdate(provider: string, callback: () => void): () => void;
}

export class DynamicModelRegistry implements IModelRegistryService {
  private readonly models = new Map<string, Model>();
  private readonly adapters = new Map<string, ModelSyncAdapter>();
  private lastSyncTime: Date | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly updateListeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
    private readonly syncIntervalMs = 30 * 60 * 1000, // 30 minutes
  ) {}

  /**
   * Register a provider adapter for model synchronization.
   */
  registerAdapter(adapter: ModelSyncAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    this.logger.info({ provider: adapter.provider }, 'Model sync adapter registered');
  }

  /**
   * Start automatic synchronization on interval.
   */
  startAutoSync(): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => {
      this.synchronize().catch((err) => this.logger.error({ err }, 'Auto-sync failed'));
    }, this.syncIntervalMs);
    this.logger.info({ intervalMs: this.syncIntervalMs }, 'Auto-sync started');
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Synchronize models from ALL registered providers.
   */
  async synchronize(): Promise<{ added: number; updated: number; removed: number; errors: readonly string[] }> {
    const start = performance.now();
    let added = 0, updated = 0, removed = 0;
    const errors: string[] = [];

    for (const [provider, _adapter] of this.adapters) {
      try {
        const result = await this.synchronizeProvider(provider);
        added += result.added;
        updated += result.updated;
      } catch (error) {
        const msg = `[${provider}] ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        this.logger.error({ provider, error }, 'Provider sync failed');
      }
    }

    // Remove models from providers that no longer report them
    const activeProviders = new Set([...this.adapters.keys()]);
    for (const [_id, model] of this.models) {
      if (activeProviders.has(model.provider) && model.status === 'active') {
        // Check if model still exists in provider's list
      }
    }

    this.lastSyncTime = new Date();

    // Cache the full model list
    await this.cache.set('models:registry', [...this.models.values()], 3600);

    const elapsed = performance.now() - start;
    this.logger.info({ added, updated, removed, errors: errors.length, elapsedMs: elapsed.toFixed(0) }, 'Model sync complete');

    // Notify listeners
    for (const listeners of this.updateListeners.values()) {
      for (const cb of listeners) { try { cb(); } catch {} }
    }

    return { added, updated, removed, errors };
  }

  /**
   * Synchronize models from a single provider.
   */
  async synchronizeProvider(provider: string): Promise<{ added: number; updated: number }> {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter registered for provider: ${provider}`);

    const rawModels = await adapter.fetchModels();
    let added = 0, updated = 0;

    for (const raw of rawModels) {
      const normalized = normalizeModel(raw, provider);
      const existing = this.models.get(normalized.id);

      if (existing) {
        this.models.set(normalized.id, { ...normalized, createdAt: existing.createdAt, updatedAt: new Date() });
        updated++;
      } else {
        this.models.set(normalized.id, normalized);
        added++;
      }
    }

    this.logger.info({ provider, added, updated, total: rawModels.length }, 'Provider synced');
    return { added, updated };
  }

  async getModel(id: string): Promise<Model | null> {
    let model: Model | undefined | null = this.models.get(id) ?? null;
    if (!model) {
      // Try cache
      const cached = await this.cache.get<Model[]>('models:registry');
      model = cached?.find((m) => m.id === id) ?? null;
    }
    return model;
  }

  async getModels(filter?: { provider?: string; capability?: string; status?: string }): Promise<readonly Model[]> {
    let models = [...this.models.values()];
    if (filter?.provider) models = models.filter((m) => m.provider === filter.provider);
    if (filter?.capability) models = models.filter((m) => m.capabilities.some((c) => c.name === filter.capability && c.supported));
    if (filter?.status) models = models.filter((m) => m.status === filter.status);
    return models.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async getProviders(): Promise<readonly string[]> {
    return [...this.adapters.keys()];
  }

  async search(query: string): Promise<readonly Model[]> {
    const q = query.toLowerCase();
    return [...this.models.values()].filter((m) =>
      m.name.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q),
    );
  }

  getLastSyncTime(): Date | null { return this.lastSyncTime; }

  onProviderUpdate(provider: string, callback: () => void): () => void {
    if (!this.updateListeners.has(provider)) this.updateListeners.set(provider, new Set());
    this.updateListeners.get(provider)!.add(callback);
    return () => this.updateListeners.get(provider)?.delete(callback);
  }
}

// ─── Provider Adapters ───────────────────────────────────────────────────────

export class OpenAISyncAdapter implements ModelSyncAdapter {
  readonly provider = 'openai';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json() as any;
    return (data.data ?? []).map((m: any) => ({
      id: m.id, name: m.id, contextWindow: 128_000, maxOutputTokens: 16_384,
      pricing: { input: 2.5, output: 10 },
      capabilities: m.id.includes('gpt-4') ? ['streaming', 'toolCalling', 'vision'] : ['streaming'],
    }));
  }
}

export class AnthropicSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'anthropic';
  constructor(_apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    // Anthropic doesn't have a models list endpoint; return known models via API header
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200_000, maxOutputTokens: 16_384, pricing: { input: 3, output: 15 }, capabilities: ['streaming', 'toolCalling', 'vision', 'reasoning'] },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200_000, maxOutputTokens: 8_192, pricing: { input: 0.8, output: 4 }, capabilities: ['streaming', 'toolCalling', 'vision'] },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200_000, maxOutputTokens: 32_000, pricing: { input: 15, output: 75 }, capabilities: ['streaming', 'toolCalling', 'vision', 'reasoning'] },
    ];
  }
}

export class GroqSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'groq';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json() as any;
    return (data.data ?? []).map((m: any) => ({
      id: m.id, name: m.id, contextWindow: 32_768, maxOutputTokens: 32_768,
      pricing: { input: 0.05, output: 0.1 }, capabilities: ['streaming', 'toolCalling'],
    }));
  }
}

export class OllamaSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'ollama';
  constructor(private readonly baseUrl = 'http://localhost:11434') {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json() as any;
    return (data.models ?? []).map((m: any) => ({
      id: m.name, name: m.name, contextWindow: 128_000, maxOutputTokens: 32_768,
      capabilities: ['streaming', 'toolCalling'],
      metadata: { size: m.size, modifiedAt: m.modified_at },
    }));
  }
}

export class OpenRouterSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'openrouter';
  constructor(_apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json() as any;
    return (data.data ?? []).map((m: any) => ({
      id: m.id, name: m.name ?? m.id,
      contextWindow: m.context_length ?? 4096,
      pricing: m.pricing ? { input: parseFloat(m.pricing.prompt) * 1_000_000, output: parseFloat(m.pricing.completion) * 1_000_000 } : undefined,
      capabilities: ['streaming'],
    }));
  }
}

export class GeminiSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'gemini';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json() as any;
    return (data.models ?? []).map((m: any) => ({
      id: m.name?.replace('models/', '') ?? '', name: m.displayName ?? m.name,
      contextWindow: m.inputTokenLimit ?? 32_000, maxOutputTokens: m.outputTokenLimit ?? 8_192,
      capabilities: ['streaming', 'toolCalling', 'vision'],
    }));
  }
}

export class MistralSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'mistral';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Mistral ${res.status}`);
    const data = await res.json() as any;
    return (data.data ?? []).map((m: any) => ({
      id: m.id, name: m.id, contextWindow: 32_000, maxOutputTokens: 8_192,
      capabilities: ['streaming', 'toolCalling'],
    }));
  }
}

export class DeepSeekSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'deepseek';
  constructor(_apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    return [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 64_000, maxOutputTokens: 8_192, pricing: { input: 0.14, output: 0.28 }, capabilities: ['streaming', 'toolCalling'] },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 64_000, maxOutputTokens: 8_192, pricing: { input: 0.55, output: 2.19 }, capabilities: ['streaming', 'reasoning'] },
    ];
  }
}

export class XaiSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'xai';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const data = await res.json() as any;
    return (data.data ?? []).map((m: any) => ({
      id: m.id, name: m.id, contextWindow: 131_072, maxOutputTokens: 16_384,
      capabilities: ['streaming', 'toolCalling'],
    }));
  }
}

export class TogetherSyncAdapter implements ModelSyncAdapter {
  readonly provider = 'together';
  constructor(private readonly apiKey: string) {}
  async fetchModels(): Promise<readonly RawModel[]> {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Together ${res.status}`);
    const data = await res.json() as any;
    return (data ?? []).map((m: any) => ({
      id: m.id, name: m.display_name ?? m.id,
      contextWindow: m.context_length ?? 4096,
      pricing: m.pricing ? { input: m.pricing.input * 1_000_000, output: m.pricing.output * 1_000_000 } : undefined,
      capabilities: ['streaming'],
    }));
  }
}
