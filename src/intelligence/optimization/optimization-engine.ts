/**
 * Optimization Engine
 *
 * Optimizes plans and execution for speed, cost, accuracy, stability, efficiency, resource usage.
 */

import type { OptimizationObjective, OptimizationResult, Plan, PlanStep } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IOptimizationEngine {
  optimize(plan: Plan, objective: OptimizationObjective): { plan: Plan; result: OptimizationResult };
  analyzeTradeoffs(plan: Plan): Record<OptimizationObjective, { score: number; recommendation: string }>;
  suggestOptimizations(plan: Plan): readonly string[];
  calculateOptimalProvider(steps: readonly PlanStep[]): Record<string, string>;
}

export class OptimizationEngine implements IOptimizationEngine {
  constructor(private readonly logger: ILogger) {}

  optimize(plan: Plan, objective: OptimizationObjective): { plan: Plan; result: OptimizationResult } {
    const before = this.measurePlan(plan);
    let optimizedSteps = [...plan.steps];

    switch (objective) {
      case 'speed':
        optimizedSteps = this.optimizeForSpeed(optimizedSteps);
        break;
      case 'cost':
        optimizedSteps = this.optimizeForCost(optimizedSteps);
        break;
      case 'accuracy':
        optimizedSteps = this.optimizeForAccuracy(optimizedSteps);
        break;
      case 'stability':
        optimizedSteps = this.optimizeForStability(optimizedSteps);
        break;
      case 'efficiency':
        optimizedSteps = this.optimizeForEfficiency(optimizedSteps);
        break;
      case 'resource_usage':
        optimizedSteps = this.optimizeForResources(optimizedSteps);
        break;
    }

    const optimizedPlan = { ...plan, steps: optimizedSteps };
    const after = this.measurePlan(optimizedPlan);
    const improvement = this.calculateImprovement(before, after, objective);

    return {
      plan: optimizedPlan,
      result: {
        objective, before, after, improvement,
        recommendations: this.suggestOptimizations(optimizedPlan),
      },
    };
  }

  analyzeTradeoffs(plan: Plan): Record<OptimizationObjective, { score: number; recommendation: string }> {
    return {
      speed: { score: plan.estimatedDurationMs < 60000 ? 0.9 : 0.5, recommendation: plan.estimatedDurationMs > 60000 ? 'Parallelize independent steps' : 'Already fast' },
      cost: { score: plan.estimatedCost < 10 ? 0.9 : 0.4, recommendation: plan.estimatedCost > 10 ? 'Use cheaper models for non-critical steps' : 'Cost-effective' },
      accuracy: { score: plan.steps.some((s) => s.agentRole === 'reviewer') ? 0.85 : 0.6, recommendation: 'Add validation steps' },
      stability: { score: plan.steps.filter((s) => s.fallback).length / Math.max(1, plan.steps.length), recommendation: 'Add fallback strategies' },
      efficiency: { score: 0.7, recommendation: 'Reduce redundant steps' },
      resource_usage: { score: plan.estimatedTokens < 50000 ? 0.8 : 0.5, recommendation: 'Use context compression' },
    };
  }

  suggestOptimizations(plan: Plan): readonly string[] {
    const suggestions: string[] = [];
    if (plan.estimatedTokens > 50000) suggestions.push('Compress context to reduce token usage');
    if (plan.estimatedDurationMs > 120000) suggestions.push('Parallelize independent steps');
    if (plan.steps.length > 8) suggestions.push('Consider hierarchical decomposition');
    if (!plan.steps.some((s) => s.fallback)) suggestions.push('Add fallback strategies for resilience');
    if (plan.riskScore > 50) suggestions.push('Add approval gates for high-risk steps');
    if (plan.estimatedCost > 50) suggestions.push('Use cheaper models for non-critical tasks');
    return suggestions;
  }

  calculateOptimalProvider(steps: readonly PlanStep[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const step of steps) {
      if (step.riskLevel === 'high') mapping[step.id] = 'openai'; // Most capable
      else if (step.estimatedTokens > 10000) mapping[step.id] = 'groq'; // Fastest
      else mapping[step.id] = 'anthropic'; // Balanced
    }
    return mapping;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private optimizeForSpeed(steps: PlanStep[]): PlanStep[] {
    return steps.map((s) => ({ ...s, estimatedDurationMs: Math.floor(s.estimatedDurationMs * 0.7) }));
  }

  private optimizeForCost(steps: PlanStep[]): PlanStep[] {
    return steps.map((s) => ({ ...s, estimatedTokens: Math.floor(s.estimatedTokens * 0.6) }));
  }

  private optimizeForAccuracy(steps: PlanStep[]): PlanStep[] {
    // Add review step if not present
    const hasReview = steps.some((s) => s.agentRole === 'reviewer');
    if (!hasReview) {
      steps.push({
        id: crypto.randomUUID(), name: 'Quality Review', description: 'Validate output accuracy',
        agentRole: 'reviewer', toolIds: [], dependencies: [steps[steps.length - 1]?.id ?? ''],
        estimatedTokens: 2000, estimatedDurationMs: 5000, requiresApproval: false,
        riskLevel: 'low', fallback: null,
      });
    }
    return steps;
  }

  private optimizeForStability(steps: PlanStep[]): PlanStep[] {
    return steps.map((s) => ({ ...s, fallback: s.fallback ?? 'Retry with backoff' }));
  }

  private optimizeForEfficiency(steps: PlanStep[]): PlanStep[] {
    return steps;
  }

  private optimizeForResources(steps: PlanStep[]): PlanStep[] {
    return steps.map((s) => ({
      ...s,
      estimatedTokens: Math.floor(s.estimatedTokens * 0.5),
    }));
  }

  private measurePlan(plan: Plan): Record<string, number> {
    return {
      tokens: plan.steps.reduce((s, st) => s + st.estimatedTokens, 0),
      durationMs: plan.steps.reduce((s, st) => s + st.estimatedDurationMs, 0),
      steps: plan.steps.length,
      cost: plan.estimatedCost,
    };
  }

  private calculateImprovement(before: Record<string, number>, after: Record<string, number>, objective: OptimizationObjective): number {
    const key = objective === 'speed' ? 'durationMs' : objective === 'cost' ? 'cost' : 'tokens';
    const b = before[key] ?? 1;
    const a = after[key] ?? 1;
    return b > 0 ? (b - a) / b : 0;
  }
}
