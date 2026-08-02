/**
 * Reflection Engine
 *
 * Self-reflection, learning from outcomes, and adaptive improvement.
 */

import type { ReflectionEntry, ReasoningResult, EvaluationResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { nanoid } from 'nanoid';

export interface IReflectionEngine {
  reflectOnExecution(goalId: string, reasoning: ReasoningResult, evaluation: EvaluationResult): ReflectionEntry;
  reflectOnFailure(goalId: string, error: string, context: Record<string, unknown>): ReflectionEntry;
  getReflections(goalId: string): readonly ReflectionEntry[];
  getLessons(limit?: number): readonly { lesson: string; frequency: number; lastSeen: Date }[];
  getAdjustments(strategy: string): readonly string[];
  learn(entry: ReflectionEntry): void;
}

export class ReflectionEngine implements IReflectionEngine {
  private readonly reflections = new Map<string, ReflectionEntry[]>();
  private readonly lessons = new Map<string, { count: number; lastSeen: Date }>();

  constructor(private readonly logger: ILogger) {}

  reflectOnExecution(goalId: string, reasoning: ReasoningResult, evaluation: EvaluationResult): ReflectionEntry {
    const observations: string[] = [];
    const lessons: string[] = [];
    const adjustments: string[] = [];

    // Analyze reasoning quality
    if (reasoning.confidence < 0.6) {
      observations.push('Low confidence in reasoning output');
      lessons.push('Consider using tree or consensus strategy for complex goals');
      adjustments.push('Switch to multi-perspective reasoning');
    }

    if (reasoning.totalTokens > 50000) {
      observations.push('High token consumption');
      lessons.push('Break down complex goals into smaller sub-tasks');
      adjustments.push('Use more concise prompts');
    }

    // Analyze evaluation results
    for (const score of evaluation.scores) {
      if (score.score < 0.5) {
        observations.push(`Low score on ${score.dimension}: ${score.score.toFixed(2)}`);
        lessons.push(`Focus on improving ${score.dimension}`);
      }
    }

    if (evaluation.overall >= 0.8) {
      observations.push('Excellent execution quality');
      lessons.push('Current strategy is effective for this type of goal');
    }

    // Identify patterns
    if (reasoning.steps.length > 10) {
      lessons.push('Consider hierarchical decomposition for multi-step goals');
    }

    const entry: ReflectionEntry = {
      id: nanoid(), goalId, phase: 'post_execution',
      observations, lessons, adjustments,
      confidence: evaluation.overall, timestamp: new Date(),
    };

    this.learn(entry);
    this.logger.info({ goalId, lessons: lessons.length, confidence: evaluation.overall }, 'Reflection complete');
    return entry;
  }

  reflectOnFailure(goalId: string, error: string, context: Record<string, unknown>): ReflectionEntry {
    const observations = [`Failure: ${error}`];
    const lessons: string[] = [];
    const adjustments: string[] = [];

    if (error.includes('timeout')) {
      lessons.push('Increase timeout or reduce task complexity');
      adjustments.push('Add timeout guards to long-running operations');
    }
    if (error.toLowerCase().includes('token')) {
      lessons.push('Token budget exceeded');
      adjustments.push('Use context compression before sending to model');
    }
    if (error.includes('permission') || error.includes('denied')) {
      lessons.push('Permission issue encountered');
      adjustments.push('Request approval before attempting privileged operations');
    }

    lessons.push('Always checkpoint before risky operations');
    adjustments.push('Implement pre-flight validation');

    const entry: ReflectionEntry = {
      id: nanoid(), goalId, phase: 'failure_analysis',
      observations, lessons, adjustments, confidence: 0.3, timestamp: new Date(),
    };

    this.learn(entry);
    return entry;
  }

  getReflections(goalId: string): readonly ReflectionEntry[] {
    return this.reflections.get(goalId) ?? [];
  }

  getLessons(limit = 50): readonly { lesson: string; frequency: number; lastSeen: Date }[] {
    return [...this.lessons.entries()]
      .map(([lesson, data]) => ({ lesson, frequency: data.count, lastSeen: data.lastSeen }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  getAdjustments(strategy: string): readonly string[] {
    const allAdjustments: string[] = [];
    for (const entries of this.reflections.values()) {
      for (const entry of entries) {
        allAdjustments.push(...entry.adjustments);
      }
    }
    // Deduplicate
    return [...new Set(allAdjustments)];
  }

  learn(entry: ReflectionEntry): void {
    // Store reflection
    if (!this.reflections.has(entry.goalId)) this.reflections.set(entry.goalId, []);
    this.reflections.get(entry.goalId)!.push(entry);

    // Aggregate lessons
    for (const lesson of entry.lessons) {
      const existing = this.lessons.get(lesson);
      if (existing) {
        existing.count++;
        existing.lastSeen = new Date();
      } else {
        this.lessons.set(lesson, { count: 1, lastSeen: new Date() });
      }
    }
  }
}
