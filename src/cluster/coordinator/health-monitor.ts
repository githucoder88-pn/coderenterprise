/**
 * Health Monitor
 *
 * Monitors node health, agent health, and region health across the distributed cluster.
 */

import type { ClusterHealth, RegionId } from './types.js';
import type { ClusterManager } from './cluster-manager.js';
import type { AgentScheduler } from './agent-scheduler.js';

export interface IHealthMonitor {
  getClusterHealth(): ClusterHealth;
  getRegionHealth(regionId: RegionId): { status: string; nodes: number; healthyNodes: number };
  getAgentHealth(agentId: string): { status: string; uptime: number; taskCompletion: number };
  checkNodeHealth(nodeId: string): { healthy: boolean; issues: readonly string[] };
  getUnhealthyNodes(): readonly { nodeId: string; regionId: string; issues: readonly string[] }[];
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): Record<string, number>;
}

export class HealthMonitor implements IHealthMonitor {
  private readonly metrics = new Map<string, number>();

  constructor(
    private readonly clusterManager: ClusterManager,
    private readonly agentScheduler: AgentScheduler,
  ) {}

  getClusterHealth(): ClusterHealth {
    return this.clusterManager.getHealth();
  }

  getRegionHealth(regionId: RegionId): { status: string; nodes: number; healthyNodes: number } {
    const nodes = this.clusterManager.getNodesByRegion(regionId);
    const healthy = nodes.filter((n) => n.lifecycle !== 'terminated');
    const status = healthy.length === 0 ? 'offline' : healthy.length < nodes.length ? 'degraded' : 'healthy';
    return { status, nodes: nodes.length, healthyNodes: healthy.length };
  }

  getAgentHealth(agentId: string): { status: string; uptime: number; taskCompletion: number } {
    const agent = this.agentScheduler.getAgent(agentId);
    if (!agent) return { status: 'unknown', uptime: 0, taskCompletion: 0 };
    const completedTasks = agent.tasks.filter((t) => t.status === 'completed').length;
    return {
      status: agent.lifecycle,
      uptime: Date.now() - agent.createdAt.getTime(),
      taskCompletion: agent.tasks.length > 0 ? completedTasks / agent.tasks.length : 0,
    };
  }

  checkNodeHealth(nodeId: string): { healthy: boolean; issues: readonly string[] } {
    const node = this.clusterManager.getNode(nodeId);
    if (!node) return { healthy: false, issues: ['Node not found'] };
    const issues: string[] = [];
    if (node.resources.cpu.usage > 95) issues.push('CPU critically high');
    if (node.resources.memory.percent > 95) issues.push('Memory critically high');
    if (Date.now() - node.lastHeartbeat.getTime() > 30_000) issues.push('Heartbeat stale');
    return { healthy: issues.length === 0, issues };
  }

  getUnhealthyNodes(): readonly { nodeId: string; regionId: string; issues: readonly string[] }[] {
    const result: { nodeId: string; regionId: string; issues: readonly string[] }[] = [];
    for (const node of this.clusterManager.getAvailableNodes()) {
      const health = this.checkNodeHealth(node.id);
      if (!health.healthy) result.push({ nodeId: node.id, regionId: node.regionId, issues: health.issues });
    }
    return result;
  }

  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    const key = labels ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : name;
    this.metrics.set(key, value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
