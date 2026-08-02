/**
 * Task Planner
 *
 * Decomposes goals into tasks using AI planning.
 * Assigns tasks to appropriate agent roles.
 */

import type { Goal, Task, AgentRole, WorkflowStep } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ITaskPlanner {
  decompose(goal: Goal): Promise<readonly Task[]>;
  assignRoles(tasks: readonly Task[]): Map<string, AgentRole>;
  estimateComplexity(task: Task): 'low' | 'medium' | 'high';
  resolveDependencies(tasks: readonly Task[]): readonly Task[][];
}

export class TaskPlanner implements ITaskPlanner {
  constructor(private readonly logger: ILogger) {}

  async decompose(goal: Goal): Promise<readonly Task[]> {
    this.logger.info({ goalId: goal.id, title: goal.title }, 'Decomposing goal');

    // Rule-based decomposition
    const tasks: Task[] = [];
    const now = new Date();

    // Always start with planning
    tasks.push(this.createTask(goal.id, 'Analyze requirements and create plan', 'Analyze the goal, identify constraints, and create a detailed implementation plan.', 100, [], now));

    // Research if complex
    if (goal.description.length > 200) {
      tasks.push(this.createTask(goal.id, 'Research existing patterns', 'Research the codebase for existing patterns, conventions, and related implementations.', 80, [], now));
    }

    // Architecture
    tasks.push(this.createTask(goal.id, 'Design architecture', 'Design the system architecture, define interfaces, and plan the implementation structure.', 90, [tasks[0]!.id], now));

    // Implementation
    tasks.push(this.createTask(goal.id, 'Implement solution', 'Write the code implementing the designed architecture. Follow existing patterns and conventions.', 70, [tasks[tasks.length - 1]!.id], now));

    // Testing
    tasks.push(this.createTask(goal.id, 'Write tests', 'Write comprehensive unit and integration tests for the implementation.', 60, [tasks[tasks.length - 1]!.id], now));

    // Review
    tasks.push(this.createTask(goal.id, 'Review implementation', 'Review the code for bugs, security issues, performance problems, and style violations.', 50, [tasks[tasks.length - 1]!.id], now));

    // Documentation
    tasks.push(this.createTask(goal.id, 'Write documentation', 'Document the implementation with inline comments, README updates, and API documentation.', 40, [tasks[tasks.length - 2]!.id], now));

    this.logger.info({ goalId: goal.id, taskCount: tasks.length }, 'Goal decomposed');
    return tasks;
  }

  assignRoles(tasks: readonly Task[]): Map<string, AgentRole> {
    const assignments = new Map<string, AgentRole>();
    for (const task of tasks) {
      assignments.set(task.id, this.inferRole(task));
    }
    return assignments;
  }

  estimateComplexity(task: Task): 'low' | 'medium' | 'high' {
    const desc = task.description.toLowerCase();
    if (desc.includes('simple') || desc.includes('rename') || desc.includes('move')) return 'low';
    if (desc.includes('architecture') || desc.includes('refactor') || desc.includes('security')) return 'high';
    return 'medium';
  }

  resolveDependencies(tasks: readonly Task[]): readonly Task[][] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const resolved = new Set<string>();
    const levels: Task[][] = [];

    while (resolved.size < tasks.length) {
      const level: Task[] = [];
      for (const task of tasks) {
        if (resolved.has(task.id)) continue;
        const depsResolved = task.dependencies.every((d) => resolved.has(d));
        if (depsResolved) level.push(task);
      }
      if (level.length === 0) break; // Circular dependency
      for (const t of level) resolved.add(t.id);
      levels.push(level);
    }

    return levels;
  }

  private createTask(goalId: string, title: string, description: string, priority: number, dependencies: readonly string[], now: Date): Task {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      goalId, title, description, assignedAgentId: null, status: 'pending',
      priority, dependencies: [...dependencies], input: description, output: null,
      artifacts: [], retries: 0, maxRetries: 3, error: null, metadata: {},
      createdAt: now, updatedAt: now,
    };
  }

  private inferRole(task: Task): AgentRole {
    const title = task.title.toLowerCase();
    if (title.includes('plan') || title.includes('analyze')) return 'planner';
    if (title.includes('research')) return 'researcher';
    if (title.includes('architect') || title.includes('design')) return 'architect';
    if (title.includes('implement') || title.includes('code') || title.includes('build')) return 'coder';
    if (title.includes('review') || title.includes('check')) return 'reviewer';
    if (title.includes('test')) return 'tester';
    if (title.includes('debug') || title.includes('fix')) return 'debugger';
    if (title.includes('document')) return 'documenter';
    return 'coder';
  }
}
