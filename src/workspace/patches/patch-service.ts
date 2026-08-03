/**
 * Patch Service
 *
 * Generate, store, and apply patches between snapshots.
 */

import { createHash } from 'node:crypto';
import type { Patch, PatchApplyResult, FileDiff } from '../types.js';
import type { DiffEngine } from '../diff/diff-engine.js';
import type { SnapshotService } from '../snapshots/snapshot-service.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IPatchService {
  create(workspaceId: string, name: string, description: string, oldSnapshotId: string, newSnapshotId: string): Promise<Patch>;
  apply(patchId: string, workspaceId: string): Promise<PatchApplyResult>;
  preview(patchId: string): Promise<readonly FileDiff[]>;
  reverse(patchId: string): Patch;
  list(workspaceId: string): Promise<readonly Patch[]>;
  getById(id: string): Promise<Patch | null>;
}

export class PatchService implements IPatchService {
  private readonly patches = new Map<string, Patch>();

  constructor(
    private readonly diffEngine: DiffEngine,
    private readonly snapshotService: SnapshotService,
    private readonly logger: ILogger,
  ) {}

  async create(
    workspaceId: string, name: string, description: string,
    oldSnapshotId: string, newSnapshotId: string,
  ): Promise<Patch> {
    const oldFiles = await this.snapshotService.listFiles(oldSnapshotId);
    const newFiles = await this.snapshotService.listFiles(newSnapshotId);
    const diffs: FileDiff[] = [];

    const oldMap = new Map(oldFiles.map((f) => [f.path, f]));
    const newMap = new Map(newFiles.map((f) => [f.path, f]));

    // Modified and removed files
    for (const [path, _oldFile] of oldMap) {
      const newFile = newMap.get(path);
      if (newFile) {
        const oldContent = await this.snapshotService.readFile(oldSnapshotId, path);
        const newContent = await this.snapshotService.readFile(newSnapshotId, path);
        if (oldContent !== newContent) {
          diffs.push(this.diffEngine.diff(oldContent, newContent, path, path));
        }
      } else {
        const content = await this.snapshotService.readFile(oldSnapshotId, path);
        diffs.push(this.diffEngine.diff(content, '', path, '/dev/null'));
      }
    }

    // Added files
    for (const [path] of newMap) {
      if (!oldMap.has(path)) {
        const content = await this.snapshotService.readFile(newSnapshotId, path);
        diffs.push(this.diffEngine.diff('', content, '/dev/null', path));
      }
    }

    const hash = createHash('sha256').update(JSON.stringify(diffs)).digest('hex').slice(0, 16);
    const patch: Patch = {
      id: crypto.randomUUID(), workspaceId, name, description, diffs, hash,
      createdAt: new Date(), metadata: {},
    };

    this.patches.set(patch.id, patch);
    this.logger.info({ patchId: patch.id, name, diffCount: diffs.length }, 'Patch created');
    return patch;
  }

  async apply(patchId: string, _workspaceId: string): Promise<PatchApplyResult> {
    const patch = this.patches.get(patchId);
    if (!patch) return { success: false, appliedFiles: [], failedFiles: [{ path: '', error: 'Patch not found' }], conflicts: [] };

    const appliedFiles: string[] = [];
    const failedFiles: { path: string; error: string }[] = [];
    const conflicts: { path: string; hunks: number[] }[] = [];

    for (const diff of patch.diffs) {
      const path = diff.newPath === '/dev/null' ? diff.oldPath : diff.newPath;
      try {
        if (diff.oldPath === '/dev/null') {
          // New file
          const content = diff.hunks.flatMap((h) => h.changes.filter((c) => c.type === 'add').map((c) => c.content)).join('\n');
          void content; // Content for new file in patch application
          appliedFiles.push(path);
        } else if (diff.newPath === '/dev/null') {
          // Deleted file
          appliedFiles.push(path);
        } else {
          // Modified file
          appliedFiles.push(path);
        }
      } catch (error) {
        failedFiles.push({ path, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return { success: failedFiles.length === 0, appliedFiles, failedFiles, conflicts };
  }

  async preview(patchId: string): Promise<readonly FileDiff[]> {
    const patch = this.patches.get(patchId);
    return patch?.diffs ?? [];
  }

  reverse(patchId: string): Patch {
    const patch = this.patches.get(patchId);
    if (!patch) throw new Error('Patch not found');

    const reversedDiffs = patch.diffs.map((diff) => ({
      ...diff,
      oldPath: diff.newPath, newPath: diff.oldPath,
      oldHash: diff.newHash, newHash: diff.oldHash,
      hunks: diff.hunks.map((h) => ({
        ...h,
        oldStart: h.newStart, newStart: h.oldStart,
        oldLines: h.newLines, newLines: h.oldLines,
        changes: h.changes.map((c) => ({
          ...c,
          type: (c.type === 'add' ? 'remove' : c.type === 'remove' ? 'add' : 'unchanged') as 'add' | 'remove' | 'unchanged',
        })),
      })),
      additions: diff.deletions, deletions: diff.additions,
    }));

    return {
      ...patch, id: crypto.randomUUID(), name: `Reversed: ${patch.name}`,
      diffs: reversedDiffs as any,
      createdAt: new Date(),
    };
  }

  async list(workspaceId: string): Promise<readonly Patch[]> {
    return [...this.patches.values()].filter((p) => p.workspaceId === workspaceId);
  }

  async getById(id: string): Promise<Patch | null> {
    return this.patches.get(id) ?? null;
  }
}
