/**
 * Auto-Scaler
 *
 * Monitors metrics and makes scaling decisions based on policies.
 * Supports CPU, memory, queue length, latency, and request count triggers.
 */

import type { ScalingPolicy, ScalingDecision, ClusterNode, QueueName } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

interface MetricSnapshot {
  readonly cpu: number;
  readonly memory: number;
  readonly queueLength: number;
  readonly latencyMs: number;
  readonly requestCount: number;
  readonly timestamp: Date;
}

export interface IAutoScaler {
  addPolicy(policy: ScalingPolicy): void;
  removePolicy(metric: ScalingPolicy['metric']): void;
  evaluate(nodes: readonly ClusterNode[], queueLengths: Record<QueueName, number>): ScalingDecision | null;
  recordMetrics(snapshot: MetricSnapshot): void;
  getMetrics(): readonly MetricSnapshot[];
  getDecisions(): readonly ScalingDecision[];
  getLastScaleAction(): Date | null;
}

export class AutoScaler implements IAutoScaler {
  private readonly policies = new Map<string, ScalingPolicy>();
  private readonly metrics: MetricSnapshot[] = [];
  private readonly decisions: ScalingDecision[] = [];
  private lastScaleAction: Date | null = null;
  private readonly cooldownTracker = new Map<string, Date>();

  constructor(private readonly logger: ILogger) {
    // Default policies
    this.addPolicy({ metric: 'cpu', threshold: 80, direction: 'up', cooldownMs: 60_000, stepSize: 1, minInstances: 1, maxInstances: 100 });
    this.addPolicy({ metric: 'cpu', threshold: 30, direction: 'down', cooldownMs: 120_000, stepSize: 1, minInstances: 1, maxInstances: 100 });
    this.addPolicy({ metric: 'queue_length', threshold: 1000, direction: 'up', cooldownMs: 30_000, stepSize: 2, minInstances: 1, maxInstances: 100 });
    this.addPolicy({ metric: 'memory', threshold: 85, direction: 'up', cooldownMs: 60_000, stepSize: 1, minInstances: 1, maxInstances: 100 });
  }

  addPolicy(policy: ScalingPolicy): void {
    const key = `${policy.metric}:${policy.direction}`;
    this.policies.set(key, policy);
  }

  removePolicy(metric: ScalingPolicy['metric']): void {
    this.policies.delete(`${metric}:up`);
    this.policies.delete(`${metric}:down`);
  }

  evaluate(nodes: readonly ClusterNode[], queueLengths: Record<QueueName, number>): ScalingDecision | null {
    const currentInstances = nodes.length;
    const totalQueueLength = Object.values(queueLengths).reduce((sum, len) => sum + len, 0);
    const avgCpu = nodes.length > 0 ? nodes.reduce((sum, n) => sum + n.cpu.usage, 0) / nodes.length : 0;
    const avgMemory = nodes.length > 0 ? nodes.reduce((sum, n) => sum + n.memory.percent, 0) / nodes.length : 0;

    for (const [key, policy] of this.policies) {
      let value = 0;
      switch (policy.metric) {
        case 'cpu': value = avgCpu; break;
        case 'memory': value = avgMemory; break;
        case 'queue_length': value = totalQueueLength; break;
        case 'latency': value = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1]!.latencyMs : 0; break;
        case 'request_count': value = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1]!.requestCount : 0; break;
      }

      const shouldScale = policy.direction === 'up' ? value > policy.threshold : value < policy.threshold;
      if (!shouldScale) continue;

      // Check cooldown
      const lastAction = this.cooldownTracker.get(policy.metric);
      if (lastAction && Date.now() - lastAction.getTime() < policy.cooldownMs) continue;

      const desiredInstances = policy.direction === 'up'
        ? Math.min(policy.maxInstances, currentInstances + policy.stepSize)
        : Math.max(policy.minInstances, currentInstances - policy.stepSize);

      if (desiredInstances === currentInstances) continue;

      const decision: ScalingDecision = {
        currentInstances, desiredInstances,
        reason: `${policy.metric} ${policy.direction === 'up' ? 'exceeded' : 'below'} threshold (${value.toFixed(1)} vs ${policy.threshold})`,
        metric: policy.metric, value, threshold: policy.threshold,
        timestamp: new Date(),
      };

      this.decisions.push(decision);
      this.cooldownTracker.set(policy.metric, new Date());
      this.lastScaleAction = new Date();

      this.logger.info(decision, 'Scaling decision');
      return decision;
    }

    return null;
  }

  recordMetrics(snapshot: MetricSnapshot): void {
    this.metrics.push(snapshot);
    if (this.metrics.length > 1000) this.metrics.splice(0, 100);
  }

  getMetrics(): readonly MetricSnapshot[] { return this.metrics; }
  getDecisions(): readonly ScalingDecision[] { return this.decisions; }
  getLastScaleAction(): Date | null { return this.lastScaleAction; }
}
