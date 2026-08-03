/**
 * Distributed Agent Scheduler
 *
 * Schedules agents across regions and nodes with fault tolerance.
 */

import type { DistributedAgent, DistributedTask, RegionId, AgentLifecycle } from './types.js';
import type { ClusterManager } from './cluster-manager.js';
import type { NodeManager } from './node-manager.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IAgentScheduler {
  scheduleAgent(agent: Omit<DistributedAgent, 'id' | 'nodeId' | 'regionId' | 'lifecycle' | 'tasks' | 'currentTaskId' | 'checkpointId' | 'resourceUsage' | 'retryCount' | 'error' | 'createdAt' | 'updatedAt'>, preferredRegion?: RegionId): Promise<DistributedAgent>;
  assignToNode(agentId: string, nodeId: string): boolean;
  startExecution(agentId: string): void;
  completeAgent(agentId: string): void;
  failAgent(agentId: string, error: string): void;
  migrateAgent(agentId: string, targetNodeId: string): boolean;
  addTask(agentId: string, task: Omit<DistributedTask, 'id' | 'agentId' | 'nodeId' | 'regionId' | 'retries' | 'checkpointId' | 'error' | 'createdAt' | 'updatedAt'>): DistributedTask;
  getAgent(id: string): DistributedAgent | null;
  getAgentsByRegion(regionId: RegionId): readonly DistributedAgent[];
  getAgentsByStatus(status: AgentLifecycle): readonly DistributedAgent[];
  recoverFromCheckpoint(agentId: string, checkpointId: string): boolean;
  getStats(): { total: number; byStatus: Record<string, number>; byRegion: Record<string, number> };
}

export class AgentScheduler implements IAgentScheduler {
  private readonly agents = new Map<string, DistributedAgent>();

  constructor(
    private readonly clusterManager: ClusterManager,
    private readonly nodeManager: NodeManager,
    private readonly logger: ILogger,
  ) {}

  async scheduleAgent(
    input: Omit<DistributedAgent, 'id' | 'nodeId' | 'regionId' | 'lifecycle' | 'tasks' | 'currentTaskId' | 'checkpointId' | 'resourceUsage' | 'retryCount' | 'error' | 'createdAt' | 'updatedAt'>,
    preferredRegion?: RegionId,
  ): Promise<DistributedAgent> {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    // Select best node
    const nodes = preferredRegion
      ? this.clusterManager.getAvailableNodes(preferredRegion)
      : this.clusterManager.getAvailableNodes();

    const bestNode = this.nodeManager.selectBestNode(nodes);

    const agent: DistributedAgent = {
      ...input, id,
      nodeId: bestNode?.id ?? null, regionId: bestNode?.regionId ?? null,
      lifecycle: bestNode ? 'queued' : 'created',
      tasks: [], currentTaskId: null, checkpointId: null,
      resourceUsage: { cpuMs: 0, memoryMb: 0, tokensUsed: 0 },
      retryCount: 0, maxRetries: input.maxRetries, error: null,
      metadata: input.metadata ?? {}, createdAt: now, updatedAt: now,
    };

    this.agents.set(id, agent);
    this.logger.info({ agentId: id, role: input.role, regionId: agent.regionId, nodeId: agent.nodeId }, 'Agent scheduled');
    return agent;
  }

  assignToNode(agentId: string, nodeId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    const node = this.clusterManager.getNode(nodeId);
    if (!node) return false;

    this.agents.set(agentId, {
      ...agent, nodeId, regionId: node.regionId,
      lifecycle: 'queued', updatedAt: new Date(),
    });
    this.nodeManager.allocate(nodeId);
    return true;
  }

  startExecution(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    this.agents.set(agentId, { ...agent, lifecycle: 'running', updatedAt: new Date() });
    if (agent.nodeId) {
      this.clusterManager.updateNodeLifecycle(agent.nodeId, 'executing');
    }
  }

  completeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    this.agents.set(agentId, { ...agent, lifecycle: 'completed', updatedAt: new Date() });
    if (agent.nodeId) this.nodeManager.release(agent.nodeId);
  }

  failAgent(agentId: string, error: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.retryCount < agent.maxRetries) {
      // Retry: re-queue
      this.agents.set(agentId, {
        ...agent, lifecycle: 'queued', retryCount: agent.retryCount + 1,
        error, updatedAt: new Date(),
      });
      this.logger.warn({ agentId, retry: agent.retryCount + 1, error }, 'Agent retrying');
    } else {
      this.agents.set(agentId, { ...agent, lifecycle: 'failed', error, updatedAt: new Date() });
      if (agent.nodeId) this.nodeManager.release(agent.nodeId);
      this.logger.error({ agentId, error }, 'Agent failed permanently');
    }
  }

  migrateAgent(agentId: string, targetNodeId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    const targetNode = this.clusterManager.getNode(targetNodeId);
    if (!targetNode) return false;

    // Release old node
    if (agent.nodeId) this.nodeManager.release(agent.nodeId);

    // Assign to new node
    this.agents.set(agentId, {
      ...agent, nodeId: targetNodeId, regionId: targetNode.regionId,
      lifecycle: 'migrating', updatedAt: new Date(),
    });
    this.nodeManager.allocate(targetNodeId);

    // Transition to running
    setTimeout(() => {
      const current = this.agents.get(agentId);
      if (current?.lifecycle === 'migrating') {
        this.agents.set(agentId, { ...current, lifecycle: 'running' });
      }
    }, 100);

    this.logger.info({ agentId, from: agent.nodeId, to: targetNodeId }, 'Agent migrated');
    return true;
  }

  addTask(agentId: string, input: Omit<DistributedTask, 'id' | 'agentId' | 'nodeId' | 'regionId' | 'retries' | 'checkpointId' | 'error' | 'createdAt' | 'updatedAt'>): DistributedTask {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const now = new Date();
    const task: DistributedTask = {
      ...input, id: `task-${Date.now()}`,
      agentId, nodeId: agent.nodeId, regionId: agent.regionId,
      retries: 0, checkpointId: null, error: null,
      createdAt: now, updatedAt: now,
    };

    this.agents.set(agentId, {
      ...agent, tasks: [...agent.tasks, task], updatedAt: new Date(),
    });
    return task;
  }

  getAgent(id: string): DistributedAgent | null { return this.agents.get(id) ?? null; }

  getAgentsByRegion(regionId: RegionId): readonly DistributedAgent[] {
    return [...this.agents.values()].filter((a) => a.regionId === regionId);
  }

  getAgentsByStatus(status: AgentLifecycle): readonly DistributedAgent[] {
    return [...this.agents.values()].filter((a) => a.lifecycle === status);
  }

  recoverFromCheckpoint(agentId: string, checkpointId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    this.agents.set(agentId, {
      ...agent, lifecycle: 'queued', checkpointId, error: null,
      retryCount: 0, updatedAt: new Date(),
    });
    this.logger.info({ agentId, checkpointId }, 'Agent recovered from checkpoint');
    return true;
  }

  getStats(): { total: number; byStatus: Record<string, number>; byRegion: Record<string, number> } {
    const all = [...this.agents.values()];
    const byStatus: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    for (const a of all) {
      byStatus[a.lifecycle] = (byStatus[a.lifecycle] ?? 0) + 1;
      if (a.regionId) byRegion[a.regionId] = (byRegion[a.regionId] ?? 0) + 1;
    }
    return { total: all.length, byStatus, byRegion };
  }
}
