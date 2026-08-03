/**
 * Execution Engine
 *
 * Orchestrates multi-agent execution with 5 patterns:
 * sequential, parallel, hierarchical, consensus, event-driven.
 */

import type { Goal, Task, AgentRole, AgentState, AgentResult, GoalResult, Artifact } from '../types.js';
import type { AgentRegistry } from '../registry/agent-registry.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IExecutionEngine {
  execute(goal: Goal): Promise<Result<GoalResult>>;
  pause(goalId: string): Promise<void>;
  resume(goalId: string): Promise<void>;
  cancel(goalId: string): Promise<void>;
}

export class ExecutionEngine implements IExecutionEngine {
  private readonly activeGoals = new Map<string, { goal: Goal; aborted: boolean }>();

  constructor(
    private readonly registry: AgentRegistry,
    private readonly logger: ILogger,
  ) {}

  async execute(goal: Goal): Promise<Result<GoalResult>> {
    const start = performance.now();
    this.activeGoals.set(goal.id, { goal, aborted: false });
    this.logger.info({ goalId: goal.id, pattern: goal.workflowPattern, mode: goal.executionMode }, 'Execution started');

    try {
      let result: GoalResult;

      switch (goal.workflowPattern) {
        case 'sequential':
          result = await this.executeSequential(goal);
          break;
        case 'parallel':
          result = await this.executeParallel(goal);
          break;
        case 'hierarchical':
          result = await this.executeHierarchical(goal);
          break;
        case 'consensus':
          result = await this.executeConsensus(goal);
          break;
        case 'event-driven':
          result = await this.executeEventDriven(goal);
          break;
        default:
          result = await this.executeSequential(goal);
      }

      result = { ...result, totalDurationMs: performance.now() - start };
      this.activeGoals.delete(goal.id);
      return { success: true, data: result };
    } catch (error) {
      this.activeGoals.delete(goal.id);
      this.logger.error({ goalId: goal.id, error }, 'Execution failed');
      return { success: false, error: { code: ErrorCode.INTERNAL, message: error instanceof Error ? error.message : 'Execution failed', timestamp: new Date() } };
    }
  }

  async pause(goalId: string): Promise<void> {
    const entry = this.activeGoals.get(goalId);
    if (entry) {
      this.activeGoals.set(goalId, { ...entry, goal: { ...entry.goal, status: 'planning' } });
      this.logger.info({ goalId }, 'Execution paused');
    }
  }

  async resume(goalId: string): Promise<void> {
    const entry = this.activeGoals.get(goalId);
    if (entry) {
      this.activeGoals.set(goalId, { ...entry, goal: { ...entry.goal, status: 'executing' } });
      this.logger.info({ goalId }, 'Execution resumed');
    }
  }

  async cancel(goalId: string): Promise<void> {
    const entry = this.activeGoals.get(goalId);
    if (entry) {
      this.activeGoals.set(goalId, { ...entry, aborted: true });
      this.logger.info({ goalId }, 'Execution cancelled');
    }
  }

  // ─── Sequential ──────────────────────────────────────────────────────────

  private async executeSequential(goal: Goal): Promise<GoalResult> {
    const results: AgentResult[] = [];
    const allArtifacts: Artifact[] = [];
    let totalTokens = 0;

    for (const task of goal.tasks) {
      if (this.activeGoals.get(goal.id)?.aborted) break;

      const agent = this.selectAgent(goal, task);
      if (!agent) continue;

      try {
        const result = await this.registry.executeTask(agent.id, task);
        results.push(result);
        allArtifacts.push(...result.artifacts);
        totalTokens += result.tokenUsage.total;
      } catch (error) {
        if (task.retries < task.maxRetries) {
          // Retry with fresh agent
          const retryAgent = this.registry.createAgent(agent.role, agent.context);
          const retryResult = await this.registry.executeTask(retryAgent.id, task);
          results.push(retryResult);
        } else {
          this.logger.error({ taskId: task.id, error }, 'Task failed after retries');
        }
      }
    }

    return {
      success: results.every((r) => r.success),
      summary: `Completed ${results.length}/${goal.tasks.length} tasks`,
      artifacts: allArtifacts,
      totalDurationMs: 0,
      totalTokens,
      taskStats: {
        completed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        total: goal.tasks.length,
      },
    };
  }

  // ─── Parallel ────────────────────────────────────────────────────────────

  private async executeParallel(goal: Goal): Promise<GoalResult> {
    // Group tasks by dependency level
    const levels = this.topologicalSort(goal.tasks);
    const allArtifacts: Artifact[] = [];
    let totalTokens = 0;
    let completed = 0;
    let failed = 0;

    for (const level of levels) {
      if (this.activeGoals.get(goal.id)?.aborted) break;

      const promises = level.map(async (task) => {
        const agent = this.selectAgent(goal, task);
        if (!agent) return null;
        try {
          const result = await this.registry.executeTask(agent.id, task);
          allArtifacts.push(...result.artifacts);
          totalTokens += result.tokenUsage.total;
          completed++;
          return result;
        } catch {
          failed++;
          return null;
        }
      });

      await Promise.allSettled(promises);
    }

    return {
      success: failed === 0,
      summary: `Parallel: ${completed} completed, ${failed} failed`,
      artifacts: allArtifacts, totalDurationMs: 0, totalTokens,
      taskStats: { completed, failed, total: goal.tasks.length },
    };
  }

  // ─── Hierarchical ────────────────────────────────────────────────────────

  private async executeHierarchical(goal: Goal): Promise<GoalResult> {
    // Lead agent (planner/architect) delegates to specialists
    const leadRole: AgentRole = 'planner';
    const leadAgent = this.registry.createAgent(leadRole, {
      workflowId: goal.id, goalId: goal.id, parentAgentId: null,
      childAgentIds: [], executionMode: goal.executionMode,
      maxIterations: goal.maxIterations, currentIteration: 0,
      workspaceId: goal.metadata['workspaceId'] as string ?? null,
      conversationId: goal.metadata['conversationId'] as string ?? null,
      permissions: [], systemPrompt: '', availableTools: [],
    });

    // Lead analyzes and delegates
    const delegationTask: Task = {
      id: `delegate-${Date.now()}`, goalId: goal.id,
      title: 'Analyze and delegate tasks', description: goal.description,
      assignedAgentId: leadAgent.id, status: 'assigned', priority: 100,
      dependencies: [], input: goal.description, output: null, artifacts: [],
      retries: 0, maxRetries: 1, error: null, metadata: {},
      createdAt: new Date(), updatedAt: new Date(),
    };

    await this.registry.executeTask(leadAgent.id, delegationTask);

    // Execute delegated tasks in parallel
    return this.executeParallel({ ...goal, tasks: goal.tasks });
  }

  // ─── Consensus ───────────────────────────────────────────────────────────

  private async executeConsensus(goal: Goal): Promise<GoalResult> {
    // Multiple agents work on same task, vote on best result
    const consensusRoles: AgentRole[] = ['coder', 'reviewer', 'architect'];
    const allArtifacts: Artifact[] = [];
    let totalTokens = 0;

    for (const task of goal.tasks) {
      if (this.activeGoals.get(goal.id)?.aborted) break;

      const results = await Promise.allSettled(
        consensusRoles.map((role) => {
          const agent = this.registry.createAgent(role, {
            workflowId: goal.id, goalId: goal.id, parentAgentId: null,
            childAgentIds: [], executionMode: goal.executionMode,
            maxIterations: 1, currentIteration: 0,
            workspaceId: null, conversationId: null,
            permissions: [], systemPrompt: '', availableTools: [],
          });
          return this.registry.executeTask(agent.id, task);
        }),
      );

      const successful = results
        .filter((r): r is PromiseFulfilledResult<AgentResult> => r.status === 'fulfilled' && r.value.success)
        .map((r) => r.value);

      if (successful.length > 0) {
        // Vote: pick the result with the most detailed output
        const best = successful.sort((a, b) => b.output.length - a.output.length)[0]!;
        allArtifacts.push(...best.artifacts);
        totalTokens += successful.reduce((s, r) => s + r.tokenUsage.total, 0);
      }
    }

    return {
      success: allArtifacts.length > 0 || goal.tasks.length === 0,
      summary: `Consensus: processed ${goal.tasks.length} tasks with ${consensusRoles.length} agents each`,
      artifacts: allArtifacts, totalDurationMs: 0, totalTokens,
      taskStats: { completed: goal.tasks.length, failed: 0, total: goal.tasks.length },
    };
  }

  // ─── Event-Driven ────────────────────────────────────────────────────────

  private async executeEventDriven(goal: Goal): Promise<GoalResult> {
    // Tasks executed in response to events
    return this.executeSequential(goal);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private selectAgent(goal: Goal, task: Task): AgentState | null {
    // Check if task has assigned role
    const role = (task.metadata['agentRole'] as AgentRole) ?? this.inferRole(task);
    const available = this.registry.getAvailableAgents().filter((a) => a.role === role);

    if (available.length > 0) return available[0]!;

    // Create new agent
    return this.registry.createAgent(role, {
      workflowId: goal.id, goalId: goal.id, parentAgentId: null,
      childAgentIds: [], executionMode: goal.executionMode,
      maxIterations: goal.maxIterations, currentIteration: 0,
      workspaceId: goal.metadata['workspaceId'] as string ?? null,
      conversationId: goal.metadata['conversationId'] as string ?? null,
      permissions: [], systemPrompt: this.getSystemPrompt(role), availableTools: [],
    });
  }

  private inferRole(task: Task): AgentRole {
    const title = task.title.toLowerCase();
    if (title.includes('plan') || title.includes('design')) return 'planner';
    if (title.includes('research') || title.includes('analyze')) return 'researcher';
    if (title.includes('architect') || title.includes('structure')) return 'architect';
    if (title.includes('code') || title.includes('implement') || title.includes('build')) return 'coder';
    if (title.includes('review') || title.includes('check')) return 'reviewer';
    if (title.includes('test') || title.includes('spec')) return 'tester';
    if (title.includes('debug') || title.includes('fix')) return 'debugger';
    if (title.includes('document') || title.includes('readme')) return 'documenter';
    if (title.includes('deploy') || title.includes('release')) return 'deployer';
    if (title.includes('security') || title.includes('audit')) return 'security';
    return 'coder';
  }

  private getSystemPrompt(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      planner: 'You are a planning agent. Break down complex goals into actionable tasks. Consider dependencies, priorities, and resource constraints.',
      researcher: 'You are a research agent. Gather information, analyze codebases, and provide detailed findings to inform decisions.',
      architect: 'You are an architecture agent. Design system structures, define interfaces, and ensure scalability and maintainability.',
      coder: 'You are a coding agent. Write clean, tested, production-quality code. Follow existing patterns and conventions.',
      reviewer: 'You are a code review agent. Identify bugs, security issues, performance problems, and suggest improvements.',
      tester: 'You are a testing agent. Write comprehensive unit, integration, and e2e tests. Ensure high coverage.',
      debugger: 'You are a debugging agent. Diagnose issues, trace root causes, and implement fixes with regression tests.',
      documenter: 'You are a documentation agent. Write clear, comprehensive documentation for code, APIs, and architecture.',
      deployer: 'You are a deployment agent. Manage CI/CD pipelines, containerization, and infrastructure.',
      security: 'You are a security agent. Identify vulnerabilities, enforce best practices, and ensure compliance.',
    };
    return prompts[role];
  }

  private topologicalSort(tasks: readonly Task[]): Task[][] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const levels: Task[][] = [];

    const getLevel = (taskId: string): number => {
      if (visited.has(taskId)) return -1;
      const task = taskMap.get(taskId);
      if (!task || task.dependencies.length === 0) return 0;
      return Math.max(...task.dependencies.map((dep) => getLevel(dep) + 1));
    };

    for (const task of tasks) {
      const level = getLevel(task.id);
      if (!levels[level]) levels[level] = [];
      levels[level]!.push(task);
      visited.add(task.id);
    }

    return levels.filter((l) => l.length > 0);
  }
}
