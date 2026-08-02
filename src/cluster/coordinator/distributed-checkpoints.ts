/**
 * Distributed Checkpoint Manager
 *
 * Cross-region checkpoint creation, restoration, and replication.
 */

import { createHash } from 'node:crypto';
import type { DistributedCheckpoint, DistributedAgent, DistributedMemory, RegionId } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IDistributedCheckpointManager {
  create(agentId: string, goalId: string, regionId: RegionId, nodeId: string, agent: DistributedAgent, memory: DistributedMemory, taskState: Record<string, unknown>): DistributedCheckpoint;
  get(id: string): DistributedCheckpoint | null;
  getByAgent(agentId: string): readonly DistributedCheckpoint[];
  getLatest(agentId: string): DistributedCheckpoint | null;
  restore(id: string): DistributedCheckpoint | null;
  replicate(id: string, targetRegion: RegionId): Promise<DistributedCheckpoint>;
  delete(id: string): void;
  cleanup(maxAgeMs: number): number;
  getStats(): { total: number; byRegion: Record<string, number>; totalSizeBytes: number };
}

export class DistributedCheckpointManager implements IDistributedCheckpointManager {
  private readonly checkpoints = new Map<string, DistributedCheckpoint>();
  private cpCounter = 0;

  constructor(private readonly logger: ILogger) {}

  create(
    agentId: string, goalId: string, regionId: RegionId, nodeId: string,
    agent: DistributedAgent, memory: DistributedMemory, taskState: Record<string, unknown>,
  ): DistributedCheckpoint {
    const id = `dcp-${++this.cpCounter}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    const state = { agent: { ...agent }, memory: { ...memory }, taskState };
    const stateJson = JSON.stringify(state);
    const hash = createHash('sha256').update(stateJson).digest('hex').slice(0, 16);

    const checkpoint: DistributedCheckpoint = {
      id, agentId, goalId, regionId, nodeId,
      state, hash, size: stateJson.length,
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.checkpoints.set(id, checkpoint);
    this.logger.info({ id, agentId, regionId, size: checkpoint.size }, 'Checkpoint created');
    return checkpoint;
  }

  get(id: string): DistributedCheckpoint | null { return this.checkpoints.get(id) ?? null; }

  getByAgent(agentId: string): readonly DistributedCheckpoint[] {
    return [...this.checkpoints.values()]
      .filter((c) => c.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getLatest(agentId: string): DistributedCheckpoint | null {
    return this.getByAgent(agentId)[0] ?? null;
  }

  restore(id: string): DistributedCheckpoint | null {
    const cp = this.checkpoints.get(id);
    if (!cp) return null;
    this.logger.info({ id, agentId: cp.agentId, regionId: cp.regionId }, 'Checkpoint restored');
    return cp;
  }

  async replicate(id: string, targetRegion: RegionId): Promise<DistributedCheckpoint> {
    const cp = this.checkpoints.get(id);
    if (!cp) throw new Error(`Checkpoint ${id} not found`);

    const replica: DistributedCheckpoint = {
      ...cp, id: `${id}-replica-${targetRegion}`,
      regionId: targetRegion, updatedAt: new Date(),
    };

    this.checkpoints.set(replica.id, replica);
    this.logger.info({ id, targetRegion }, 'Checkpoint replicated');
    return replica;
  }

  delete(id: string): void { this.checkpoints.delete(id); }

  cleanup(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = 0;
    for (const [id, cp] of this.checkpoints) {
      if (cp.createdAt.getTime() < cutoff) { this.checkpoints.delete(id); cleaned++; }
    }
    return cleaned;
  }

  getStats(): { total: number; byRegion: Record<string, number>; totalSizeBytes: number } {
    const all = [...this.checkpoints.values()];
    const byRegion: Record<string, number> = {};
    let totalSize = 0;
    for (const cp of all) {
      byRegion[cp.regionId] = (byRegion[cp.regionId] ?? 0) + 1;
      totalSize += cp.size;
    }
    return { total: all.length, byRegion, totalSizeBytes: totalSize };
  }
}
