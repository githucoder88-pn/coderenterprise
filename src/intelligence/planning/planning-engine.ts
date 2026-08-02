/**
 * Planning Engine
 *
 * Goal decomposition, dependency analysis, risk assessment, plan optimization.
 */

import type { Plan, PlanStep, IntelligenceGoal, ReasoningStrategy, Constraint } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

export interface IPlanningEngine {
  createPlan(goal: IntelligenceGoal, strategy: ReasoningStrategy): Promise<Plan>;
  optimizePlan(plan: Plan, objective: 'speed' | 'cost' | 'accuracy'): Plan;
  estimateCost(plan: Plan): { tokens: number; durationMs: number; cost: number };
  assessRisk(plan: Plan): { score: number; factors: readonly string[] };
  validatePlan(plan: Plan, constraints: readonly Constraint[]): { valid: boolean; violations: readonly string[] };
  generateAlternatives(plan: Plan, count?: number): readonly Plan[];
}

export class PlanningEngine implements IPlanningEngine {
  constructor(private readonly logger: ILogger) {}

  async createPlan(goal: IntelligenceGoal, strategy: ReasoningStrategy): Promise<Plan> {
    const steps = this.decomposeIntoSteps(goal);
    const estimated = this.estimateCost({ id: '', goalId: goal.id, strategy, steps, estimatedTokens: 0, estimatedDurationMs: 0, estimatedCost: 0, riskScore: 0, confidence: 0, alternatives: [] });
    const risk = this.assessRisk({ id: '', goalId: goal.id, strategy, steps, estimatedTokens: 0, estimatedDurationMs: 0, estimatedCost: 0, riskScore: 0, confidence: 0, alternatives: [] });

    const plan: Plan = {
      id: nanoid(), goalId: goal.id, strategy, steps,
      estimatedTokens: estimated.tokens,
      estimatedDurationMs: estimated.durationMs,
      estimatedCost: estimated.cost,
      riskScore: risk.score,
      confidence: 0.75,
      alternatives: [],
    };

    this.logger.info({ planId: plan.id, steps: steps.length, riskScore: risk.score }, 'Plan created');
    return plan;
  }

  optimizePlan(plan: Plan, objective: 'speed' | 'cost' | 'accuracy'): Plan {
    let optimized = [...plan.steps];

    switch (objective) {
      case 'speed':
        // Parallelize independent steps
        optimized = optimized.map((s) => ({ ...s, estimatedDurationMs: s.estimatedDurationMs * 0.8 }));
        break;
      case 'cost':
        // Reduce token estimates for cheaper models
        optimized = optimized.map((s) => ({ ...s, estimatedTokens: Math.floor(s.estimatedTokens * 0.7) }));
        break;
      case 'accuracy':
        // Add validation steps
        optimized.push({
          id: nanoid(), name: 'Validation', description: 'Validate output quality',
          agentRole: 'reviewer', toolIds: [], dependencies: [optimized[optimized.length - 1]?.id ?? ''],
          estimatedTokens: 2000, estimatedDurationMs: 5000, requiresApproval: false,
          riskLevel: 'low', fallback: null,
        });
        break;
    }

    return { ...plan, steps: optimized };
  }

  estimateCost(plan: Plan): { tokens: number; durationMs: number; cost: number } {
    const tokens = plan.steps.reduce((sum, s) => sum + s.estimatedTokens, 0);
    const durationMs = plan.steps.reduce((sum, s) => sum + s.estimatedDurationMs, 0);
    const cost = (tokens / 1_000_000) * 5; // $5 per 1M tokens average
    return { tokens, durationMs, cost };
  }

  assessRisk(plan: Plan): { score: number; factors: readonly string[] } {
    const factors: string[] = [];
    let score = 0;

    if (plan.steps.length > 10) { factors.push('High complexity (>10 steps)'); score += 20; }
    if (plan.steps.some((s) => s.riskLevel === 'high')) { factors.push('Contains high-risk steps'); score += 30; }
    if (plan.steps.some((s) => s.toolIds.length > 3)) { factors.push('Many tool dependencies'); score += 10; }
    if (plan.estimatedTokens > 100_000) { factors.push('High token usage'); score += 15; }
    if (plan.estimatedDurationMs > 300_000) { factors.push('Long execution time'); score += 10; }

    return { score: Math.min(100, score), factors };
  }

  validatePlan(plan: Plan, constraints: readonly Constraint[]): { valid: boolean; violations: readonly string[] } {
    const violations: string[] = [];
    const estimated = this.estimateCost(plan);

    for (const constraint of constraints) {
      switch (constraint.type) {
        case 'token_budget':
          if (estimated.tokens > (constraint.value as number)) violations.push(`Token budget exceeded: ${estimated.tokens} > ${constraint.value}`);
          break;
        case 'time_limit':
          if (estimated.durationMs > (constraint.value as number)) violations.push(`Time limit exceeded: ${estimated.durationMs}ms > ${constraint.value}ms`);
          break;
        case 'cost_limit':
          if (estimated.cost > (constraint.value as number)) violations.push(`Cost limit exceeded: $${estimated.cost} > $${constraint.value}`);
          break;
      }
    }

    return { valid: violations.length === 0, violations };
  }

  generateAlternatives(plan: Plan, count = 3): readonly Plan[] {
    const alternatives: Plan[] = [];
    const strategies: ReasoningStrategy[] = ['sequential', 'tree', 'hierarchical', 'consensus'];

    for (let i = 0; i < count; i++) {
      const strategy = strategies[i % strategies.length]!;
      const altSteps = this.reorderSteps(plan.steps, strategy);
      alternatives.push({
        ...plan, id: nanoid(), strategy, steps: altSteps,
        confidence: plan.confidence * (0.8 + Math.random() * 0.2),
      });
    }

    return alternatives;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private decomposeIntoSteps(goal: IntelligenceGoal): PlanStep[] {
    const desc = goal.description.toLowerCase();
    const steps: PlanStep[] = [];
    const now = () => nanoid();

    // Analysis phase
    steps.push({
      id: now(), name: 'Analyze', description: `Analyze goal: ${goal.description.slice(0, 100)}`,
      agentRole: 'planner', toolIds: [], dependencies: [],
      estimatedTokens: 1000, estimatedDurationMs: 3000,
      requiresApproval: false, riskLevel: 'low', fallback: null,
    });

    // Conditional steps based on goal content
    if (desc.includes('build') || desc.includes('implement') || desc.includes('create')) {
      steps.push({
        id: now(), name: 'Design', description: 'Design architecture and plan implementation',
        agentRole: 'architect', toolIds: [], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 2000, estimatedDurationMs: 5000,
        requiresApproval: false, riskLevel: 'low', fallback: null,
      });
      steps.push({
        id: now(), name: 'Implement', description: 'Implement the solution',
        agentRole: 'coder', toolIds: ['fs.createFile', 'fs.updateFile'], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 10000, estimatedDurationMs: 30000,
        requiresApproval: true, riskLevel: 'medium', fallback: 'Retry with different approach',
      });
      steps.push({
        id: now(), name: 'Test', description: 'Write and run tests',
        agentRole: 'tester', toolIds: ['fs.createFile', 'shell.execute'], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 5000, estimatedDurationMs: 15000,
        requiresApproval: false, riskLevel: 'low', fallback: null,
      });
    } else if (desc.includes('fix') || desc.includes('debug')) {
      steps.push({
        id: now(), name: 'Diagnose', description: 'Identify root cause',
        agentRole: 'debugger', toolIds: ['search.search', 'fs.readFile'], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 3000, estimatedDurationMs: 10000,
        requiresApproval: false, riskLevel: 'low', fallback: null,
      });
      steps.push({
        id: now(), name: 'Fix', description: 'Apply the fix',
        agentRole: 'coder', toolIds: ['fs.updateFile'], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 2000, estimatedDurationMs: 5000,
        requiresApproval: true, riskLevel: 'medium', fallback: null,
      });
    } else if (desc.includes('review') || desc.includes('analyze')) {
      steps.push({
        id: now(), name: 'Review', description: 'Perform detailed review',
        agentRole: 'reviewer', toolIds: ['fs.readFile', 'search.search'], dependencies: [steps[steps.length - 1]!.id],
        estimatedTokens: 5000, estimatedDurationMs: 15000,
        requiresApproval: false, riskLevel: 'low', fallback: null,
      });
    }

    // Always add validation
    steps.push({
      id: now(), name: 'Validate', description: 'Validate output meets success criteria',
      agentRole: 'reviewer', toolIds: [], dependencies: [steps[steps.length - 1]!.id],
      estimatedTokens: 1000, estimatedDurationMs: 3000,
      requiresApproval: false, riskLevel: 'low', fallback: null,
    });

    return steps;
  }

  private reorderSteps(steps: readonly PlanStep[], strategy: ReasoningStrategy): PlanStep[] {
    switch (strategy) {
      case 'hierarchical':
        return [...steps].sort((a, b) => {
          const priority: Record<string, number> = { planner: 0, architect: 1, coder: 2, tester: 3, reviewer: 4 };
          return (priority[a.agentRole] ?? 5) - (priority[b.agentRole] ?? 5);
        });
      case 'consensus':
        return steps.map((s) => ({ ...s, name: `Consensus: ${s.name}` }));
      default:
        return [...steps];
    }
  }
}
