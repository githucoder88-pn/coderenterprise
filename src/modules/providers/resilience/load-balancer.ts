/**
 * Load Balancer
 *
 * Distributes requests across providers using configurable strategies.
 */

import type {
  ProviderName,
  LoadBalancerConfig,
  Provider,
} from '../types.js';

interface ProviderLatency {
  readonly provider: ProviderName;
  readonly avgLatencyMs: number;
  readonly totalRequests: number;
}

export class LoadBalancer {
  private currentIndex = 0;
  private readonly latencies = new Map<ProviderName, number[]>();

  constructor(private readonly config: LoadBalancerConfig) {}

  /**
   * Select the next provider to use.
   */
  select(providers: readonly Provider[]): Provider | null {
    if (providers.length === 0) return null;
    if (providers.length === 1) return providers[0]!;

    switch (this.config.strategy) {
      case 'round-robin':
        return this.roundRobin(providers);
      case 'least-latency':
        return this.leastLatency(providers);
      case 'weighted-random':
        return this.weightedRandom(providers);
      case 'priority':
        return this.priority(providers);
      default:
        return this.roundRobin(providers);
    }
  }

  /**
   * Record latency for a provider completion.
   */
  recordLatency(provider: ProviderName, latencyMs: number): void {
    if (!this.latencies.has(provider)) {
      this.latencies.set(provider, []);
    }
    const latencies = this.latencies.get(provider)!;
    latencies.push(latencyMs);

    // Keep last 100 samples
    if (latencies.length > 100) {
      latencies.shift();
    }
  }

  /**
   * Get latency stats for all tracked providers.
   */
  getLatencyStats(): readonly ProviderLatency[] {
    const stats: ProviderLatency[] = [];
    for (const [provider, samples] of this.latencies) {
      stats.push({
        provider,
        avgLatencyMs: samples.reduce((a, b) => a + b, 0) / samples.length,
        totalRequests: samples.length,
      });
    }
    return stats.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
  }

  private roundRobin(providers: readonly Provider[]): Provider {
    const provider = providers[this.currentIndex % providers.length]!;
    this.currentIndex++;
    return provider;
  }

  private leastLatency(providers: readonly Provider[]): Provider {
    let bestProvider = providers[0]!;
    let bestLatency = Infinity;

    for (const provider of providers) {
      const samples = this.latencies.get(provider.name);
      if (!samples || samples.length === 0) {
        // No data → prefer it (optimistic)
        return provider;
      }
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (avg < bestLatency) {
        bestLatency = avg;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  private weightedRandom(providers: readonly Provider[]): Provider {
    const weights: Record<string, number> = this.config.weights ?? {};
    const totalWeight = providers.reduce(
      (sum, p) => sum + (weights[p.name] ?? 1),
      0,
    );

    let random = Math.random() * totalWeight;
    for (const provider of providers) {
      random -= weights[provider.name] ?? 1;
      if (random <= 0) return provider;
    }

    return providers[providers.length - 1]!;
  }

  private priority(providers: readonly Provider[]): Provider {
    const priorities = this.config.priorities ?? [];

    for (const name of priorities) {
      const found = providers.find((p) => p.name === name);
      if (found) return found;
    }

    return providers[0]!;
  }
}
