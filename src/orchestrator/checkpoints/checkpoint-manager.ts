/**
 * Checkpoint Manager
 *
 * Creates, lists, restores, and manages execution checkpoints.
 * Enables rollback and failure recovery.
 */

import { createHash } from 'node:crypto';
import type { Checkpoint, Goal, AgentState, Task } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ICheckpointManager {
  create(goalId: string, name: string, description: string, goal: Goal, agents: readonly AgentState[], tasks: readonly Task[]): Checkpoint;
  get(id: string): Checkpoint | null;
  list(goalId: string): readonly Checkpoint[];
  restore(id: string): Checkpoint | null;
  delete(id: string): void;
  getLatest(goalId: string): Checkpoint | null;
  compare(id1: string, id2: string): { added: string[]; removed: string[]; changed: string[] };
}

export class CheckpointManager implements ICheckpointManager {
  private readonly checkpoints = new Map<string, Checkpoint>();
  private cpCounter = 0;

  constructor(private readonly logger: ILogger) {}

  create(
    goalId: string, name: string, description: string,
    goal: Goal, agents: readonly AgentState[], tasks: readonly Task[],
  ): Checkpoint {
    const id = `cp-${++this.cpCounter}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    const state = {
      goal: { ...goal },
      agents: agents.map((a) => ({ ...a })),
      tasks: tasks.map((t) => ({ ...t })),
    };

    const hash = createHash('sha256')
      .update(JSON.stringify({ goalId, taskCount: tasks.length, agentCount: agents.length }))
      .digest('hex').slice(0, 16);

    const checkpoint: Checkpoint = {
      id, goalId, name, description, state, hash,
      metadata: { taskCount: tasks.length, agentCount: agents.length },
      createdAt: now, updatedAt: now,
    };

    this.checkpoints.set(id, checkpoint);
    this.logger.info({ id, goalId, name }, 'Checkpoint created');
    return checkpoint;
  }

  get(id: string): Checkpoint | null { return this.checkpoints.get(id) ?? null; }

  list(goalId: string): readonly Checkpoint[] {
    return [...this.checkpoints.values()]
      .filter((c) => c.goalId === goalId)
      .sort((a, b) => {
        const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
        if (timeDiff !== 0) return timeDiff;
        // Tiebreaker: use ID counter (higher ID = newer)
        const aNum = parseInt(a.id.split('-')[1] ?? '0');
        const bNum = parseInt(b.id.split('-')[1] ?? '0');
        return bNum - aNum;
      });
  }

  restore(id: string): Checkpoint | null {
    const cp = this.checkpoints.get(id);
    if (!cp) return null;
    this.logger.info({ id, goalId: cp.goalId }, 'Checkpoint restored');
    return cp;
  }

  delete(id: string): void {
    this.checkpoints.delete(id);
  }

  getLatest(goalId: string): Checkpoint | null {
    const all = this.list(goalId);
    return all[0] ?? null;
  }

  compare(id1: string, id2: string): { added: string[]; removed: string[]; changed: string[] } {
    const cp1 = this.checkpoints.get(id1);
    const cp2 = this.checkpoints.get(id2);
    if (!cp1 || !cp2) return { added: [], removed: [], changed: [] };

    const tasks1 = new Map(cp1.state.tasks.map((t) => [t.id, t]));
    const tasks2 = new Map(cp2.state.tasks.map((t) => [t.id, t]));

    const added = [...tasks2.keys()].filter((t) => !tasks1.has(t));
    const removed = [...tasks1.keys()].filter((t) => !tasks2.has(t));
    const changed: string[] = [];
    for (const [id, t1] of tasks1) {
      const t2 = tasks2.get(id);
      if (t2 && (t1.status !== t2.status || t1.output !== t2.output)) {
        changed.push(id);
      }
    }

    return { added, removed, changed };
  }
}
