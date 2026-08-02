/**
 * Cluster Monitor
 *
 * Real-time cluster health monitoring with metrics collection.
 */

import type { ClusterNode, NodeStatus } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IMetrics } from '../../telemetry/metrics.js';

export interface ClusterHealth {
  readonly status: 'healthy' | 'degraded' | 'critical';
  readonly nodes: readonly { id: string; status: NodeStatus; cpu: number; memory: number }[];
  readonly totalNodes: number;
  readonly healthyNodes: number;
  readonly totalWorkers: number;
  readonly activeWorkers: number;
  readonly uptime: number;
  readonly timestamp: string;
}

export interface IClusterMonitor {
  registerNode(node: ClusterNode): void;
  unregisterNode(nodeId: string): void;
  heartbeat(nodeId: string, metrics: { cpu: number; memory: number; load: number[] }): void;
  getHealth(): ClusterHealth;
  getNode(id: string): ClusterNode | null;
  getNodes(): readonly ClusterNode[];
  getUnhealthyNodes(): readonly ClusterNode[];
  pruneStaleNodes(maxAgeMs: number): number;
}

export class ClusterMonitor implements IClusterMonitor {
  private readonly nodes = new Map<string, ClusterNode>();
  private readonly startedAt = Date.now();

  constructor(
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
  ) {}

  registerNode(node: ClusterNode): void {
    this.nodes.set(node.id, node);
    this.logger.info({ nodeId: node.id, hostname: node.hostname, role: node.role }, 'Node registered');
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.logger.info({ nodeId }, 'Node unregistered');
  }

  heartbeat(nodeId: string, data: { cpu: number; memory: number; load: number[] }): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.set(nodeId, {
      ...node,
      cpu: { ...node.cpu, usage: data.cpu },
      memory: { ...node.memory, percent: data.memory },
      load: { m1: data.load[0] ?? 0, m5: data.load[1] ?? 0, m15: data.load[2] ?? 0 },
      lastHeartbeat: new Date(),
      status: this.calculateNodeStatus(data.cpu, data.memory),
    });

    this.metrics.gauge('cluster_node_cpu', data.cpu, { nodeId });
    this.metrics.gauge('cluster_node_memory', data.memory, { nodeId });
  }

  getHealth(): ClusterHealth {
    const nodes = [...this.nodes.values()];
    const healthyNodes = nodes.filter((n) => n.status === 'healthy').length;
    const totalWorkers = nodes.reduce((sum, n) => sum + n.workers.length, 0);
    const activeWorkers = nodes.reduce((sum, n) => sum + n.workers.filter((w) => w.status === 'busy' || w.status === 'idle').length, 0);

    let status: ClusterHealth['status'] = 'healthy';
    if (healthyNodes === 0) status = 'critical';
    else if (healthyNodes < nodes.length) status = 'degraded';

    return {
      status,
      nodes: nodes.map((n) => ({ id: n.id, status: n.status, cpu: n.cpu.usage, memory: n.memory.percent })),
      totalNodes: nodes.length, healthyNodes, totalWorkers, activeWorkers,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  getNode(id: string): ClusterNode | null { return this.nodes.get(id) ?? null; }
  getNodes(): readonly ClusterNode[] { return [...this.nodes.values()]; }
  getUnhealthyNodes(): readonly ClusterNode[] { return [...this.nodes.values()].filter((n) => n.status !== 'healthy'); }

  pruneStaleNodes(maxAgeMs: number): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, node] of this.nodes) {
      if (now - node.lastHeartbeat.getTime() > maxAgeMs) {
        this.nodes.delete(id);
        pruned++;
        this.logger.warn({ nodeId: id }, 'Stale node pruned');
      }
    }
    return pruned;
  }

  private calculateNodeStatus(cpu: number, memory: number): NodeStatus {
    if (cpu > 95 || memory > 95) return 'unhealthy';
    if (cpu > 80 || memory > 85) return 'degraded';
    return 'healthy';
  }
}
