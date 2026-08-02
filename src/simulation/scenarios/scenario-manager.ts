/**
 * Scenario Manager
 *
 * Manages test scenarios for simulations.
 */

import type { Scenario, ScenarioKind, ScenarioAssertion, ScenarioExpected } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IScenarioManager {
  create(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Scenario;
  get(id: string): Scenario | null;
  list(filter?: { kind?: ScenarioKind; category?: string; difficulty?: string }): readonly Scenario[];
  update(id: string, updates: Partial<Scenario>): Scenario;
  delete(id: string): void;
  getByCategory(category: string): readonly Scenario[];
  search(query: string): readonly Scenario[];
  validate(scenario: Scenario): { valid: boolean; errors: readonly string[] };
  generateVariants(scenario: Scenario, count: number): readonly Scenario[];
  getStats(): { total: number; byKind: Record<string, number>; byDifficulty: Record<string, number> };
}

export class ScenarioManager implements IScenarioManager {
  private readonly scenarios = new Map<string, Scenario>();

  constructor(private readonly logger: ILogger) {}

  create(input: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Scenario {
    const now = new Date();
    const scenario: Scenario = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.scenarios.set(scenario.id, scenario);
    this.logger.debug({ id: scenario.id, name: scenario.name, kind: scenario.kind }, 'Scenario created');
    return scenario;
  }

  get(id: string): Scenario | null { return this.scenarios.get(id) ?? null; }

  list(filter?: { kind?: ScenarioKind; category?: string; difficulty?: string }): readonly Scenario[] {
    let results = [...this.scenarios.values()];
    if (filter?.kind) results = results.filter((s) => s.kind === filter.kind);
    if (filter?.category) results = results.filter((s) => s.category === filter.category);
    if (filter?.difficulty) results = results.filter((s) => s.difficulty === filter.difficulty);
    return results;
  }

  update(id: string, updates: Partial<Scenario>): Scenario {
    const existing = this.scenarios.get(id);
    if (!existing) throw new Error(`Scenario ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.scenarios.set(id, updated);
    return updated;
  }

  delete(id: string): void { this.scenarios.delete(id); }

  getByCategory(category: string): readonly Scenario[] {
    return [...this.scenarios.values()].filter((s) => s.category === category);
  }

  search(query: string): readonly Scenario[] {
    const q = query.toLowerCase();
    return [...this.scenarios.values()].filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)),
    );
  }

  validate(scenario: Scenario): { valid: boolean; errors: readonly string[] } {
    const errors: string[] = [];
    if (!scenario.name) errors.push('Name is required');
    if (!scenario.input.goal) errors.push('Goal is required');
    if (scenario.assertions.length === 0) errors.push('At least one assertion is required');
    return { valid: errors.length === 0, errors };
  }

  generateVariants(scenario: Scenario, count: number): readonly Scenario[] {
    const variants: Scenario[] = [];
    for (let i = 0; i < count; i++) {
      variants.push({
        ...scenario, id: crypto.randomUUID(),
        name: `${scenario.name} (variant ${i + 1})`,
        input: { ...scenario.input, goal: `${scenario.input.goal} [variant ${i + 1}]` },
        createdAt: new Date(), updatedAt: new Date(),
      });
    }
    return variants;
  }

  getStats(): { total: number; byKind: Record<string, number>; byDifficulty: Record<string, number> } {
    const all = [...this.scenarios.values()];
    const byKind: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    for (const s of all) {
      byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
      byDifficulty[s.difficulty] = (byDifficulty[s.difficulty] ?? 0) + 1;
    }
    return { total: all.length, byKind, byDifficulty };
  }
}
