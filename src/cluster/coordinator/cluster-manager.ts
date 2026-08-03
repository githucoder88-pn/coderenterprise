/**
 * Cluster Manager
 *
 * Manages the global cluster topology: regions, nodes, health.
 */

import type { Region, RegionId, DistributedNode, ClusterHealth, NodeLifecycle } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IClusterManager {
  registerRegion(region: Region): void;
  registerNode(node: DistributedNode): void;
  deregisterNode(nodeId: string): void;
  updateNodeLifecycle(nodeId: string, lifecycle: NodeLifecycle): void;
  heartbeat(nodeId: string, resources: DistributedNode['resources']): void;
  getRegion(id: RegionId): Region | null;
  getRegions(): readonly Region[];
  getNode(id: string): DistributedNode | null;
  getNodesByRegion(regionId: RegionId): readonly DistributedNode[];
  getAvailableNodes(regionId?: RegionId): readonly DistributedNode[];
  getHealth(): ClusterHealth;
  pruneStaleNodes(maxAgeMs: number): number;
  getStats(): { regions: number; totalNodes: number; availableNodes: number; activeAgents: number };
}

export class ClusterManager implements IClusterManager {
  private readonly regions = new Map<RegionId, Region>();
  private readonly nodes = new Map<string, DistributedNode>();

  constructor(private readonly logger: ILogger) {}

  registerRegion(region: Region): void {
    this.regions.set(region.id, { ...region, nodes: [] });
    this.logger.info({ regionId: region.id, name: region.name }, 'Region registered');
  }

  registerNode(node: DistributedNode): void {
    this.nodes.set(node.id, node);
    const region = this.regions.get(node.regionId);
    if (region) {
      this.regions.set(node.regionId, {
        ...region,
        nodes: [...region.nodes.filter((n) => n.id !== node.id), node],
      });
    }
    this.logger.info({ nodeId: node.id, regionId: node.regionId }, 'Node registered');
  }

  deregisterNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.delete(nodeId);
    const region = this.regions.get(node.regionId);
    if (region) {
      this.regions.set(node.regionId, {
        ...region,
        nodes: region.nodes.filter((n) => n.id !== nodeId),
      });
    }
    this.logger.info({ nodeId }, 'Node deregistered');
  }

  updateNodeLifecycle(nodeId: string, lifecycle: NodeLifecycle): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.set(nodeId, { ...node, lifecycle, updatedAt: new Date() });
  }

  heartbeat(nodeId: string, resources: DistributedNode['resources']): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.set(nodeId, { ...node, resources, lastHeartbeat: new Date(), updatedAt: new Date() });
  }

  getRegion(id: RegionId): Region | null { return this.regions.get(id) ?? null; }
  getRegions(): readonly Region[] { return [...this.regions.values()]; }
  getNode(id: string): DistributedNode | null { return this.nodes.get(id) ?? null; }

  getNodesByRegion(regionId: RegionId): readonly DistributedNode[] {
    return [...this.nodes.values()].filter((n) => n.regionId === regionId);
  }

  getAvailableNodes(regionId?: RegionId): readonly DistributedNode[] {
    return [...this.nodes.values()].filter(
      (n) => (n.lifecycle === 'available' || n.lifecycle === 'allocated') && (!regionId || n.regionId === regionId),
    );
  }

  getHealth(): ClusterHealth {
    const regions = [...this.regions.values()].map((r) => {
      const regionNodes = [...this.nodes.values()].filter((n) => n.regionId === r.id);
      const healthy = regionNodes.filter((n) => n.lifecycle !== 'terminated');
      const cpuAvg = healthy.length > 0 ? healthy.reduce((s, n) => s + n.resources.cpu.usage, 0) / healthy.length : 0;
      const memAvg = healthy.length > 0 ? healthy.reduce((s, n) => s + n.resources.memory.percent, 0) / healthy.length : 0;

      return {
        id: r.id, status: r.status === 'active' ? 'healthy' as const : r.status,
        nodes: regionNodes.length, healthyNodes: healthy.length,
        activeAgents: healthy.reduce((s, n) => s + n.resources.activeAgents, 0),
        cpuAvg, memoryAvg: memAvg,
      };
    });

    const totalNodes = regions.reduce((s, r) => s + r.nodes, 0);
    const totalHealthy = regions.reduce((s, r) => s + r.healthyNodes, 0);
    const totalAgents = regions.reduce((s, r) => s + r.activeAgents, 0);
    const totalQueued = [...this.nodes.values()].reduce((s, n) => s + n.resources.queuedTasks, 0);

    let global: ClusterHealth['global'] = 'healthy';
    if (totalHealthy === 0) global = 'critical';
    else if (totalHealthy < totalNodes * 0.5) global = 'critical';
    else if (totalHealthy < totalNodes) global = 'degraded';

    return { global, regions, totalNodes, totalHealthyNodes: totalHealthy, totalActiveAgents: totalAgents, totalQueuedTasks: totalQueued, timestamp: new Date().toISOString() };
  }

  pruneStaleNodes(maxAgeMs: number): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, node] of this.nodes) {
      if (now - node.lastHeartbeat.getTime() > maxAgeMs) {
        this.deregisterNode(id);
        pruned++;
      }
    }
    return pruned;
  }

  getStats(): { regions: number; totalNodes: number; availableNodes: number; activeAgents: number } {
    const allNodes = [...this.nodes.values()];
    return {
      regions: this.regions.size,
      totalNodes: allNodes.length,
      availableNodes: allNodes.filter((n) => n.lifecycle === 'available').length,
      activeAgents: allNodes.reduce((s, n) => s + n.resources.activeAgents, 0),
    };
  }
}
