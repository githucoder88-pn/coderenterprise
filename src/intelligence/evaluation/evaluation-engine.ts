/**
 * Evaluation Engine
 *
 * Multi-dimensional scoring: accuracy, risk, confidence, performance, cost, latency.
 */

import type { EvaluationScore, EvaluationResult, Plan, ReasoningResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IEvaluationEngine {
  evaluatePlan(plan: Plan): EvaluationResult;
  evaluateReasoning(result: ReasoningResult): EvaluationResult;
  evaluateOutput(output: string, criteria: readonly string[]): EvaluationResult;
  scoreAccuracy(output: string, expected: string): number;
  scoreConfidence(steps: readonly { confidence: number }[]): number;
  scorePerformance(durationMs: number, targetMs: number): number;
  scoreCost(tokensUsed: number, budgetTokens: number): number;
  scoreRisk(factors: readonly string[]): number;
}

export class EvaluationEngine implements IEvaluationEngine {
  constructor(_logger: ILogger) {}

  evaluatePlan(plan: Plan): EvaluationResult {
    const scores: EvaluationScore[] = [
      { dimension: 'completeness', score: this.scoreCompleteness(plan), weight: 0.25, reasoning: 'Step coverage assessment' },
      { dimension: 'feasibility', score: plan.confidence, weight: 0.2, reasoning: 'Based on plan confidence' },
      { dimension: 'risk', score: 1 - plan.riskScore / 100, weight: 0.2, reasoning: `Risk score: ${plan.riskScore}` },
      { dimension: 'efficiency', score: this.scoreEfficiency(plan), weight: 0.15, reasoning: 'Token and time efficiency' },
      { dimension: 'cost', score: Math.max(0, 1 - plan.estimatedCost / 100), weight: 0.1, reasoning: `Estimated cost: $${plan.estimatedCost}` },
      { dimension: 'maintainability', score: plan.steps.length <= 10 ? 0.8 : 0.5, weight: 0.1, reasoning: 'Step count assessment' },
    ];

    const overall = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    const recommendations = this.generateRecommendations(scores);

    return { overall, scores, passed: overall >= 0.6, recommendations, timestamp: new Date() };
  }

  evaluateReasoning(result: ReasoningResult): EvaluationResult {
    const scores: EvaluationScore[] = [
      { dimension: 'confidence', score: result.confidence, weight: 0.3, reasoning: 'Average step confidence' },
      { dimension: 'thoroughness', score: Math.min(1, result.steps.length / 5), weight: 0.25, reasoning: `${result.steps.length} reasoning steps` },
      { dimension: 'efficiency', score: result.totalTokens < 50000 ? 0.8 : 0.5, weight: 0.2, reasoning: `${result.totalTokens} tokens used` },
      { dimension: 'speed', score: result.totalDurationMs < 10000 ? 0.9 : 0.6, weight: 0.15, reasoning: `${result.totalDurationMs.toFixed(0)}ms` },
      { dimension: 'coherence', score: 0.8, weight: 0.1, reasoning: 'Step output consistency' },
    ];

    const overall = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    return { overall, scores, passed: overall >= 0.6, recommendations: [], timestamp: new Date() };
  }

  evaluateOutput(output: string, criteria: readonly string[]): EvaluationResult {
    const scores: EvaluationScore[] = criteria.map((criterion) => ({
      dimension: criterion,
      score: this.scoreCriterion(output, criterion),
      weight: 1 / criteria.length,
      reasoning: `Evaluated against: ${criterion}`,
    }));

    const overall = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    return { overall, scores, passed: overall >= 0.7, recommendations: [], timestamp: new Date() };
  }

  scoreAccuracy(output: string, expected: string): number {
    if (output === expected) return 1;
    const similarity = this.stringSimilarity(output, expected);
    return similarity;
  }

  scoreConfidence(steps: readonly { confidence: number }[]): number {
    if (steps.length === 0) return 0;
    return steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  }

  scorePerformance(durationMs: number, targetMs: number): number {
    if (durationMs <= targetMs) return 1;
    return Math.max(0, 1 - (durationMs - targetMs) / targetMs);
  }

  scoreCost(tokensUsed: number, budgetTokens: number): number {
    if (tokensUsed <= budgetTokens) return 1;
    return Math.max(0, 1 - (tokensUsed - budgetTokens) / budgetTokens);
  }

  scoreRisk(factors: readonly string[]): number {
    return Math.max(0, 1 - factors.length * 0.15);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private scoreCompleteness(plan: Plan): number {
    const hasAnalysis = plan.steps.some((s) => s.agentRole === 'planner');
    const hasImplementation = plan.steps.some((s) => s.agentRole === 'coder');
    const hasTesting = plan.steps.some((s) => s.agentRole === 'tester');
    const hasReview = plan.steps.some((s) => s.agentRole === 'reviewer');
    return [hasAnalysis, hasImplementation, hasTesting, hasReview].filter(Boolean).length / 4;
  }

  private scoreEfficiency(plan: Plan): number {
    const tokensPerStep = plan.estimatedTokens / Math.max(1, plan.steps.length);
    if (tokensPerStep < 5000) return 0.9;
    if (tokensPerStep < 10000) return 0.7;
    return 0.5;
  }

  private scoreCriterion(output: string, criterion: string): number {
    const lower = output.toLowerCase();
    const crit = criterion.toLowerCase();
    if (lower.includes(crit)) return 0.9;
    const words = crit.split(/\s+/);
    const matched = words.filter((w) => lower.includes(w)).length;
    return matched / Math.max(1, words.length);
  }

  private stringSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const matches = [...shorter].filter((ch, i) => longer[i] === ch).length;
    return matches / longer.length;
  }

  private generateRecommendations(scores: readonly EvaluationScore[]): string[] {
    const recommendations: string[] = [];
    for (const score of scores) {
      if (score.score < 0.5) {
        recommendations.push(`Improve ${score.dimension}: current score ${score.score.toFixed(2)}`);
      }
    }
    return recommendations;
  }
}
