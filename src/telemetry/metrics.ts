/**
 * Metrics Collector
 *
 * Simple in-process metrics for request timing, error rates, and custom counters.
 * Designed to be swappable with Prometheus/OTLP exporters.
 */

export interface IMetrics {
  increment(name: string, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  timer(name: string, labels?: Record<string, string>): () => number;
  snapshot(): MetricsSnapshot;
  reset(): void;
}

export interface MetricsSnapshot {
  readonly counters: Record<string, number>;
  readonly gauges: Record<string, number>;
  readonly histograms: Record<string, { readonly count: number; readonly sum: number; readonly min: number; readonly max: number }>;
}

export class MetricsCollector implements IMetrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  increment(name: string, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
  }

  timer(name: string, labels?: Record<string, string>): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.histogram(name, duration, labels);
      return duration;
    };
  }

  snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [k, v] of this.counters) counters[k] = v;

    const gauges: Record<string, number> = {};
    for (const [k, v] of this.gauges) gauges[k] = v;

    const histograms: Record<string, { count: number; sum: number; min: number; max: number }> = {};
    for (const [k, values] of this.histograms) {
      histograms[k] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return { counters, gauges, histograms };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}
