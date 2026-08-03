/**
 * Node Manager
 *
 * Manages individual node lifecycle, resource tracking, and task assignment.
 */

import type { DistributedNode, NodeResources } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface INodeManager {
  createNode(regionId: string, hostname: string, ip: string, port: number): DistributedNode;
  allocate(nodeId: string): boolean;
  release(nodeId: string): void;
  terminate(nodeId: string): void;
  updateResources(nodeId: string, resources: NodeResources): void;
  canAcceptTask(nodeId: string): boolean;
  getLoad(nodeId: string): number;
  selectBestNode(nodes: readonly DistributedNode[]): DistributedNode | null;
}

export class NodeManager implements INodeManager {
  private readonly nodes = new Map<string, DistributedNode>();

  constructor(private readonly logger: ILogger) {}

  createNode(regionId: string, hostname: string, ip: string, port: number): DistributedNode {
    const id = `node-${regionId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const node: DistributedNode = {
      id, regionId: regionId as any, hostname, ip, port,
      lifecycle: 'registering',
      capabilities: {
        maxConcurrentAgents: 10, supportedLanguages: ['typescript', 'python', 'rust'],
        hasGpu: false, hasNetwork: true, hasTerminal: true,
      },
      resources: {
        cpu: { cores: 4, usage: 0 }, memory: { total: 8192, used: 0, percent: 0 },
        disk: { total: 100_000, used: 0, percent: 0 },
        network: { bandwidthMbps: 1000, latencyMs: 1 },
        activeAgents: 0, queuedTasks: 0,
      },
      lastHeartbeat: now, metadata: {}, createdAt: now, updatedAt: now,
    };
    this.nodes.set(id, node);
    this.logger.info({ nodeId: id, regionId }, 'Node created');
    return node;
  }

  allocate(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || (node.lifecycle !== 'available' && node.lifecycle !== 'allocated')) return false;
    this.nodes.set(nodeId, { ...node, lifecycle: 'allocated', updatedAt: new Date() });
    return true;
  }

  release(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.set(nodeId, { ...node, lifecycle: 'available', updatedAt: new Date() });
  }

  terminate(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.set(nodeId, { ...node, lifecycle: 'terminated', updatedAt: new Date() });
    this.logger.info({ nodeId }, 'Node terminated');
  }

  updateResources(nodeId: string, resources: NodeResources): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.set(nodeId, { ...node, resources, lastHeartbeat: new Date(), updatedAt: new Date() });
  }

  canAcceptTask(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.lifecycle === 'terminated' || node.lifecycle === 'paused') return false;
    return node.resources.activeAgents < node.capabilities.maxConcurrentAgents;
  }

  getLoad(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 1;
    const cpuLoad = node.resources.cpu.usage / 100;
    const memLoad = node.resources.memory.percent / 100;
    return (cpuLoad + memLoad) / 2;
  }

  selectBestNode(nodes: readonly DistributedNode[]): DistributedNode | null {
    const available = nodes.filter((n) =>
      (n.lifecycle === 'available' || n.lifecycle === 'allocated') &&
      n.resources.activeAgents < n.capabilities.maxConcurrentAgents,
    );
    if (available.length === 0) return null;

    // Score based on available capacity
    return available.sort((a, b) => {
      const scoreA = (100 - a.resources.cpu.usage) + (100 - a.resources.memory.percent) - a.resources.activeAgents * 10;
      const scoreB = (100 - b.resources.cpu.usage) + (100 - b.resources.memory.percent) - b.resources.activeAgents * 10;
      return scoreB - scoreA;
    })[0]!;
  }
}
