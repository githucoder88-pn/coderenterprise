/**
 * Coordination Engine
 *
 * Coordinates multiple agents, manages shared state, handles communication.
 */

import type { CoordinationRequest, CoordinationResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

interface AgentHandle {
  readonly id: string;
  readonly role: string;
  readonly status: 'idle' | 'busy' | 'failed';
}

export interface ICoordinationEngine {
  coordinate(request: CoordinationRequest, task: (agentId: string, input: string) => Promise<string>): Promise<CoordinationResult>;
  allocateAgents(count: number, roles: readonly string[]): readonly AgentHandle[];
  releaseAgent(agentId: string): void;
  broadcast(message: string, agentIds: readonly string[]): Promise<void>;
  getActiveAgents(): readonly AgentHandle[];
}

export class CoordinationEngine implements ICoordinationEngine {
  private readonly agents = new Map<string, AgentHandle>();
  private readonly sharedMemory = new Map<string, unknown>();

  constructor(_logger: ILogger) {}

  async coordinate(
    request: CoordinationRequest,
    task: (agentId: string, input: string) => Promise<string>,
  ): Promise<CoordinationResult> {
    const start = performance.now();
    const agentResults: { agentId: string; output: string; success: boolean }[] = [];

    switch (request.strategy) {
      case 'parallel': {
        const promises = request.agents.map(async (agentId) => {
          try {
            const output = await task(agentId, request.goalId);
            return { agentId, output, success: true };
          } catch (error) {
            return { agentId, output: '', success: false };
          }
        });
        const results = await Promise.allSettled(promises);
        for (const r of results) {
          if (r.status === 'fulfilled') agentResults.push(r.value);
        }
        break;
      }

      case 'sequential': {
        for (const agentId of request.agents) {
          try {
            const output = await task(agentId, request.goalId);
            agentResults.push({ agentId, output, success: true });
            // Share output with shared memory
            if (request.sharedMemory) {
              this.sharedMemory.set(`agent:${agentId}:output`, output);
            }
          } catch {
            agentResults.push({ agentId, output: '', success: false });
          }
        }
        break;
      }

      case 'hierarchical': {
        // First agent delegates, rest execute
        if (request.agents.length > 0) {
          try {
            const leadOutput = await task(request.agents[0]!, request.goalId);
            agentResults.push({ agentId: request.agents[0]!, output: leadOutput, success: true });

            const subAgents = request.agents.slice(1);
            const subPromises = subAgents.map(async (agentId) => {
              try {
                const output = await task(agentId, leadOutput);
                return { agentId, output, success: true };
              } catch {
                return { agentId, output: '', success: false };
              }
            });
            const subResults = await Promise.allSettled(subPromises);
            for (const r of subResults) {
              if (r.status === 'fulfilled') agentResults.push(r.value);
            }
          } catch {
            agentResults.push({ agentId: request.agents[0]!, output: '', success: false });
          }
        }
        break;
      }

      case 'consensus': {
        // All agents work on same task, vote on best result
        const promises = request.agents.map(async (agentId) => {
          try {
            const output = await task(agentId, request.goalId);
            return { agentId, output, success: true };
          } catch {
            return { agentId, output: '', success: false };
          }
        });
        const results = await Promise.allSettled(promises);
        for (const r of results) {
          if (r.status === 'fulfilled') agentResults.push(r.value);
        }
        break;
      }
    }

    // Consensus: pick longest successful output
    const successful = agentResults.filter((r) => r.success && r.output);
    const consensus = successful.length > 0
      ? successful.sort((a, b) => b.output.length - a.output.length)[0]?.output ?? null
      : null;

    return {
      goalId: request.goalId,
      agentResults,
      consensus,
      totalDurationMs: performance.now() - start,
    };
  }

  allocateAgents(count: number, roles: readonly string[]): readonly AgentHandle[] {
    const allocated: AgentHandle[] = [];
    for (let i = 0; i < count; i++) {
      const agent: AgentHandle = {
        id: `agent-${nanoid(8)}`,
        role: roles[i % roles.length] ?? 'worker',
        status: 'idle',
      };
      this.agents.set(agent.id, agent);
      allocated.push(agent);
    }
    return allocated;
  }

  releaseAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  async broadcast(message: string, agentIds: readonly string[]): Promise<void> {
    for (const id of agentIds) {
      this.sharedMemory.set(`broadcast:${id}:${Date.now()}`, message);
    }
  }

  getActiveAgents(): readonly AgentHandle[] {
    return [...this.agents.values()];
  }
}
