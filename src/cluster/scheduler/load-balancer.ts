/**
 * Load Balancer
 *
 * Distributes requests across cluster nodes.
 * 4 strategies: round-robin, weighted, least-connections, failover.
 */

import type { ClusterNode, LoadBalancingStrategy, LoadBalancerConfig } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ILoadBalancer {
  select(nodes: readonly ClusterNode[]): ClusterNode | null;
  recordRequest(nodeId: string, durationMs: number): void;
  markUnhealthy(nodeId: string): void;
  markHealthy(nodeId: string): void;
  getActiveNodes(): readonly string[];
  getStats(): { totalRequests: number; strategy: string; healthyNodes: number };
}

export class LoadBalancer implements ILoadBalancer {
  private currentIndex = 0;
  private readonly latencies = new Map<string, number[]>();
  private readonly connections = new Map<string, number>();
  private readonly unhealthyNodes = new Set<string>();
  private readonly unhealthyCounts = new Map<string, number>();
  private totalRequests = 0;

  constructor(
    private readonly config: LoadBalancerConfig,
    private readonly logger: ILogger,
  ) {}

  select(nodes: readonly ClusterNode[]): ClusterNode | null {
    const healthy = nodes.filter((n) => !this.unhealthyNodes.has(n.id) && n.status !== 'offline');
    if (healthy.length === 0) return null;
    if (healthy.length === 1) return healthy[0]!;

    switch (this.config.strategy) {
      case 'round-robin': return this.roundRobin(healthy);
      case 'weighted': return this.weighted(healthy);
      case 'least-connections': return this.leastConnections(healthy);
      case 'failover': return this.failover(healthy);
      default: return this.roundRobin(healthy);
    }
  }

  recordRequest(nodeId: string, durationMs: number): void {
    this.totalRequests++;
    if (!this.latencies.has(nodeId)) this.latencies.set(nodeId, []);
    const lats = this.latencies.get(nodeId)!;
    lats.push(durationMs);
    if (lats.length > 100) lats.shift();
    this.connections.set(nodeId, (this.connections.get(nodeId) ?? 0) + 1);
    // Auto-decrement after simulated request
    setTimeout(() => {
      const cur = this.connections.get(nodeId) ?? 0;
      if (cur > 0) this.connections.set(nodeId, cur - 1);
    }, 5000);
  }

  markUnhealthy(nodeId: string): void {
    const count = (this.unhealthyCounts.get(nodeId) ?? 0) + 1;
    this.unhealthyCounts.set(nodeId, count);
    if (count >= this.config.unhealthyThreshold) {
      this.unhealthyNodes.add(nodeId);
      this.logger.warn({ nodeId }, 'Node marked unhealthy');
    }
  }

  markHealthy(nodeId: string): void {
    this.unhealthyNodes.delete(nodeId);
    this.unhealthyCounts.delete(nodeId);
  }

  getActiveNodes(): readonly string[] {
    return [...this.latencies.keys()].filter((id) => !this.unhealthyNodes.has(id));
  }

  getStats(): { totalRequests: number; strategy: string; healthyNodes: number } {
    return {
      totalRequests: this.totalRequests,
      strategy: this.config.strategy,
      healthyNodes: this.latencies.size - this.unhealthyNodes.size,
    };
  }

  private roundRobin(nodes: readonly ClusterNode[]): ClusterNode {
    const node = nodes[this.currentIndex % nodes.length]!;
    this.currentIndex++;
    return node;
  }

  private weighted(nodes: readonly ClusterNode[]): ClusterNode {
    const weights = this.config.weights ?? {};
    const totalWeight = nodes.reduce((sum, n) => sum + (weights[n.id] ?? 1), 0);
    let random = Math.random() * totalWeight;
    for (const node of nodes) {
      random -= weights[node.id] ?? 1;
      if (random <= 0) return node;
    }
    return nodes[nodes.length - 1]!;
  }

  private leastConnections(nodes: readonly ClusterNode[]): ClusterNode {
    let best = nodes[0]!;
    let bestConns = this.connections.get(best.id) ?? 0;
    for (const node of nodes) {
      const conns = this.connections.get(node.id) ?? 0;
      if (conns < bestConns) { best = node; bestConns = conns; }
    }
    return best;
  }

  private failover(nodes: readonly ClusterNode[]): ClusterNode {
    // Return first healthy node (priority order)
    return nodes[0]!;
  }
}
