/**
 * Runtime Manager
 *
 * Central coordinator for the autonomous runtime.
 * Manages workflow lifecycle, agent coordination, and execution modes.
 */

import type {
  Workflow, WorkflowStatus, ExecutionMode, ExecutionPlan, PlanStep,
  RuntimeTask, RuntimeTaskStatus, WorkflowResult,
} from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IRuntimeManager {
  createWorkflow(goal: string, mode: ExecutionMode, options?: { maxRetries?: number; approvalRequired?: boolean }): Promise<Result<Workflow>>;
  getWorkflow(id: string): Workflow | null;
  listWorkflows(status?: WorkflowStatus): readonly Workflow[];
  startWorkflow(id: string): Promise<Result<Workflow>>;
  pauseWorkflow(id: string): Result<void>;
  resumeWorkflow(id: string): Promise<Result<Workflow>>;
  cancelWorkflow(id: string): Result<void>;
  completeTask(workflowId: string, taskId: string, output: string): Promise<Result<RuntimeTask>>;
  failTask(workflowId: string, taskId: string, error: string): Promise<Result<RuntimeTask>>;
  validateTask(workflowId: string, taskId: string, passed: boolean, checks: { name: string; passed: boolean; message: string }[]): Result<void>;
  correctTask(workflowId: string, taskId: string): Promise<Result<RuntimeTask>>;
  getStats(): { total: number; byStatus: Record<string, number>; byMode: Record<string, number> };
}

export class RuntimeManager implements IRuntimeManager {
  private readonly workflows = new Map<string, Workflow>();
  private readonly tasks = new Map<string, RuntimeTask>();
  private taskCounter = 0;

  constructor(private readonly logger: ILogger) {}

  async createWorkflow(
    goal: string, mode: ExecutionMode,
    options?: { maxRetries?: number; approvalRequired?: boolean },
  ): Promise<Result<Workflow>> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    const workflow: Workflow = {
      id, goal, status: 'draft', mode,
      plan: null, tasks: [], currentTaskIndex: 0, checkpoints: [],
      approvalRequired: options?.approvalRequired ?? (mode === 'supervised' || mode === 'interactive'),
      result: null, error: null, retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.workflows.set(id, workflow);
    this.logger.info({ workflowId: id, goal, mode }, 'Workflow created');
    return { success: true, data: workflow };
  }

  getWorkflow(id: string): Workflow | null { return this.workflows.get(id) ?? null; }

  listWorkflows(status?: WorkflowStatus): readonly Workflow[] {
    const all = [...this.workflows.values()];
    return status ? all.filter((w) => w.status === status) : all;
  }

  async startWorkflow(id: string): Promise<Result<Workflow>> {
    const wf = this.workflows.get(id);
    if (!wf) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Workflow not found', timestamp: new Date() } };
    if (wf.status !== 'draft' && wf.status !== 'paused') {
      return { success: false, error: { code: ErrorCode.VALIDATION, message: `Cannot start workflow in status: ${wf.status}`, timestamp: new Date() } };
    }

    // Generate plan
    const plan = this.generatePlan(wf.goal);
    const tasks = this.createTasksFromPlan(id, plan);

    const updated = {
      ...wf, status: 'executing' as WorkflowStatus, plan, tasks,
      currentTaskIndex: 0, updatedAt: new Date(),
    };
    this.workflows.set(id, updated);
    tasks.forEach((t) => this.tasks.set(t.id, t));

    this.logger.info({ workflowId: id, taskCount: tasks.length, steps: plan.steps.length }, 'Workflow started');
    return { success: true, data: updated };
  }

  pauseWorkflow(id: string): Result<void> {
    const wf = this.workflows.get(id);
    if (!wf) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Workflow not found', timestamp: new Date() } };
    this.workflows.set(id, { ...wf, status: 'paused', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async resumeWorkflow(id: string): Promise<Result<Workflow>> {
    const wf = this.workflows.get(id);
    if (!wf) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Workflow not found', timestamp: new Date() } };
    if (wf.status !== 'paused') return { success: false, error: { code: ErrorCode.VALIDATION, message: 'Workflow is not paused', timestamp: new Date() } };
    const updated = { ...wf, status: 'executing' as WorkflowStatus, updatedAt: new Date() };
    this.workflows.set(id, updated);
    return { success: true, data: updated };
  }

  cancelWorkflow(id: string): Result<void> {
    const wf = this.workflows.get(id);
    if (!wf) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Workflow not found', timestamp: new Date() } };
    this.workflows.set(id, { ...wf, status: 'cancelled', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async completeTask(workflowId: string, taskId: string, output: string): Promise<Result<RuntimeTask>> {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Task not found', timestamp: new Date() } };

    const updatedTask = { ...task, status: 'completed' as RuntimeTaskStatus, output, updatedAt: new Date() };
    this.tasks.set(taskId, updatedTask);

    // Check if workflow is complete
    const wf = this.workflows.get(workflowId);
    if (wf) {
      const allTasks = [...this.tasks.values()].filter((t) => t.workflowId === workflowId);
      const completedCount = allTasks.filter((t) => t.status === 'completed').length;
      const failedCount = allTasks.filter((t) => t.status === 'failed').length;

      if (completedCount === allTasks.length) {
        // All tasks complete
        const result: WorkflowResult = {
          success: true, summary: `Completed ${completedCount} tasks`,
          artifacts: [], totalDurationMs: Date.now() - wf.createdAt.getTime(),
          totalTokens: 0, tasksCompleted: completedCount, tasksFailed: failedCount,
          approvalsGranted: 0, correctionsApplied: 0,
        };
        this.workflows.set(workflowId, { ...wf, status: 'completed', result, updatedAt: new Date() });
      } else {
        // Move to next task
        const nextIdx = wf.currentTaskIndex + 1;
        this.workflows.set(workflowId, { ...wf, currentTaskIndex: nextIdx, updatedAt: new Date() });
      }
    }

    return { success: true, data: updatedTask };
  }

  async failTask(workflowId: string, taskId: string, error: string): Promise<Result<RuntimeTask>> {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Task not found', timestamp: new Date() } };

    const updatedTask = { ...task, status: 'failed' as RuntimeTaskStatus, error, updatedAt: new Date() };
    this.tasks.set(taskId, updatedTask);

    const wf = this.workflows.get(workflowId);
    if (wf) {
      // Check if we can retry
      if (wf.retryCount < wf.maxRetries) {
        this.workflows.set(workflowId, { ...wf, status: 'correcting', retryCount: wf.retryCount + 1, updatedAt: new Date() });
      } else {
        this.workflows.set(workflowId, { ...wf, status: 'failed', error, updatedAt: new Date() });
      }
    }

    return { success: true, data: updatedTask };
  }

  validateTask(
    workflowId: string, taskId: string, passed: boolean,
    checks: { name: string; passed: boolean; message: string }[],
  ): Result<void> {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Task not found', timestamp: new Date() } };

    const score = checks.filter((c) => c.passed).length / Math.max(1, checks.length);
    this.tasks.set(taskId, {
      ...task, status: passed ? 'completed' : 'correcting',
      validation: { passed, checks, score, validatedAt: new Date() },
      updatedAt: new Date(),
    });

    return { success: true, data: undefined };
  }

  async correctTask(workflowId: string, taskId: string): Promise<Result<RuntimeTask>> {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Task not found', timestamp: new Date() } };

    if (task.correctionAttempts >= task.maxCorrections) {
      this.tasks.set(taskId, { ...task, status: 'failed', error: 'Max corrections exceeded', updatedAt: new Date() });
      return { success: false, error: { code: ErrorCode.INTERNAL, message: 'Max corrections exceeded', timestamp: new Date() } };
    }

    const updated = { ...task, status: 'running' as RuntimeTaskStatus, correctionAttempts: task.correctionAttempts + 1, updatedAt: new Date() };
    this.tasks.set(taskId, updated);
    return { success: true, data: updated };
  }

  getStats(): { total: number; byStatus: Record<string, number>; byMode: Record<string, number> } {
    const all = [...this.workflows.values()];
    const byStatus: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    for (const wf of all) {
      byStatus[wf.status] = (byStatus[wf.status] ?? 0) + 1;
      byMode[wf.mode] = (byMode[wf.mode] ?? 0) + 1;
    }
    return { total: all.length, byStatus, byMode };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private generatePlan(goal: string): ExecutionPlan {
    const steps: PlanStep[] = [
      { id: 's1', name: 'Analyze goal', description: 'Understand requirements and constraints', agentRole: 'planner', toolIds: [], dependencies: [], estimatedDurationMs: 5000, requiresApproval: false },
      { id: 's2', name: 'Research context', description: 'Gather relevant information from workspace and memory', agentRole: 'researcher', toolIds: ['search.search'], dependencies: ['s1'], estimatedDurationMs: 10000, requiresApproval: false },
      { id: 's3', name: 'Design solution', description: 'Create architecture and implementation plan', agentRole: 'architect', toolIds: [], dependencies: ['s2'], estimatedDurationMs: 8000, requiresApproval: false },
      { id: 's4', name: 'Implement solution', description: 'Write code and create artifacts', agentRole: 'coder', toolIds: ['fs.createFile', 'fs.updateFile', 'fs.readFile'], dependencies: ['s3'], estimatedDurationMs: 30000, requiresApproval: true },
      { id: 's5', name: 'Write tests', description: 'Create comprehensive tests', agentRole: 'tester', toolIds: ['fs.createFile', 'shell.execute'], dependencies: ['s4'], estimatedDurationMs: 20000, requiresApproval: false },
      { id: 's6', name: 'Review implementation', description: 'Review code quality, security, and correctness', agentRole: 'reviewer', toolIds: ['fs.readFile', 'search.search'], dependencies: ['s4', 's5'], estimatedDurationMs: 15000, requiresApproval: false },
      { id: 's7', name: 'Validate', description: 'Run tests and verify output', agentRole: 'tester', toolIds: ['shell.execute'], dependencies: ['s5', 's6'], estimatedDurationMs: 10000, requiresApproval: false },
    ];

    return {
      steps, estimatedDurationMs: steps.reduce((s, st) => s + st.estimatedDurationMs, 0),
      estimatedTokens: 50000,
      requiredAgents: [...new Set(steps.map((s) => s.agentRole))],
      requiredTools: [...new Set(steps.flatMap((s) => s.toolIds))],
      riskLevel: 'medium',
    };
  }

  private createTasksFromPlan(workflowId: string, plan: ExecutionPlan): RuntimeTask[] {
    const now = new Date();
    return plan.steps.map((step) => {
      const task: RuntimeTask = {
        id: `task-${++this.taskCounter}-${Math.random().toString(36).slice(2, 6)}`,
        workflowId, stepId: step.id, name: step.name, description: step.description,
        agentRole: step.agentRole, status: 'pending', input: step.description,
        output: null, validation: null, correctionAttempts: 0, maxCorrections: 3,
        approvalId: null, checkpointId: null, toolInvocations: [], error: null,
        metadata: {}, createdAt: now, updatedAt: now,
      };
      return task;
    });
  }
}
