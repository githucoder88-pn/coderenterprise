/**
 * Agent Registry
 *
 * Registers agent types, creates agent instances, manages agent lifecycle.
 */

import type { AgentRole, AgentState, AgentContext, AgentStatus, Task, AgentResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface AgentHandler {
  readonly role: AgentRole;
  execute(task: Task, context: AgentContext, memory: Map<string, unknown>): Promise<AgentResult>;
  canHandle(task: Task): boolean;
}

export interface IAgentRegistry {
  registerHandler(handler: AgentHandler): void;
  createAgent(role: AgentRole, context: AgentContext): AgentState;
  getAgent(id: string): AgentState | null;
  updateStatus(id: string, status: AgentStatus): AgentState;
  assignTask(agentId: string, task: Task): AgentState;
  completeTask(agentId: string, result: AgentResult): AgentState;
  failTask(agentId: string, error: string): AgentState;
  getAvailableAgents(): readonly AgentState[];
  getAgentsByRole(role: AgentRole): readonly AgentState[];
  getAgentsByStatus(status: AgentStatus): readonly AgentState[];
  getHandler(role: AgentRole): AgentHandler | null;
  executeTask(agentId: string, task: Task): Promise<AgentResult>;
}

export class AgentRegistry implements IAgentRegistry {
  private readonly agents = new Map<string, AgentState>();
  private readonly handlers = new Map<AgentRole, AgentHandler>();

  constructor(private readonly logger: ILogger) {}

  registerHandler(handler: AgentHandler): void {
    this.handlers.set(handler.role, handler);
    this.logger.info({ role: handler.role }, 'Agent handler registered');
  }

  private agentCounter = 0;

  createAgent(role: AgentRole, context: AgentContext): AgentState {
    const id = `agent-${role}-${++this.agentCounter}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const agent: AgentState = {
      id, role, name: `${role.charAt(0).toUpperCase() + role.slice(1)} Agent`,
      status: 'created', context,
      memory: { session: new Map(), conversation: [], semantic: [], workspace: [], global: [] },
      tasks: [], currentTask: null, result: null, error: null, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.agents.set(id, agent);
    this.logger.info({ id, role }, 'Agent created');
    return agent;
  }

  getAgent(id: string): AgentState | null { return this.agents.get(id) ?? null; }

  updateStatus(id: string, status: AgentStatus): AgentState {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    const updated = { ...agent, status, updatedAt: new Date() };
    this.agents.set(id, updated);
    return updated;
  }

  assignTask(agentId: string, task: Task): AgentState {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const updated = {
      ...agent, status: 'running' as AgentStatus, currentTask: task,
      tasks: [...agent.tasks, task], updatedAt: new Date(),
    };
    this.agents.set(agentId, updated);
    return updated;
  }

  completeTask(agentId: string, result: AgentResult): AgentState {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const updated = {
      ...agent, status: 'completed' as AgentStatus, currentTask: null, result,
      context: { ...agent.context, currentIteration: agent.context.currentIteration + 1 },
      updatedAt: new Date(),
    };
    this.agents.set(agentId, updated);
    return updated;
  }

  failTask(agentId: string, error: string): AgentState {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const updated = { ...agent, status: 'failed' as AgentStatus, currentTask: null, error, updatedAt: new Date() };
    this.agents.set(agentId, updated);
    return updated;
  }

  getAvailableAgents(): readonly AgentState[] {
    return [...this.agents.values()].filter((a) => a.status === 'created' || a.status === 'initialized' || a.status === 'completed');
  }

  getAgentsByRole(role: AgentRole): readonly AgentState[] {
    return [...this.agents.values()].filter((a) => a.role === role);
  }

  getAgentsByStatus(status: AgentStatus): readonly AgentState[] {
    return [...this.agents.values()].filter((a) => a.status === status);
  }

  getHandler(role: AgentRole): AgentHandler | null { return this.handlers.get(role) ?? null; }

  async executeTask(agentId: string, task: Task): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const handler = this.handlers.get(agent.role);
    if (!handler) throw new Error(`No handler for role: ${agent.role}`);

    this.assignTask(agentId, task);

    try {
      const result = await handler.execute(task, agent.context, agent.memory.session);
      this.completeTask(agentId, result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.failTask(agentId, errorMsg);
      throw error;
    }
  }
}
