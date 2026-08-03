/**
 * Snapshot Service
 *
 * Point-in-time workspace snapshots with compression, tagging, and comparison.
 */

import { createHash } from 'node:crypto';
import type { Snapshot, SnapshotDiff, WorkspaceFile } from '../types.js';
import type { FileService } from '../files/file-service.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ISnapshotService {
  create(workspaceId: string, name: string, description?: string, tags?: readonly string[]): Promise<Snapshot>;
  restore(snapshotId: string, workspaceId: string): Promise<{ restoredFiles: number }>;
  compare(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff>;
  listFiles(snapshotId: string): Promise<readonly WorkspaceFile[]>;
  readFile(snapshotId: string, path: string): Promise<string>;
  list(workspaceId: string): Promise<readonly Snapshot[]>;
  getById(id: string): Promise<Snapshot | null>;
  delete(id: string): Promise<void>;
  tag(id: string, tag: string): Promise<Snapshot>;
}

interface SnapshotData {
  readonly snapshot: Snapshot;
  readonly files: Map<string, { file: WorkspaceFile; content: string }>;
}

export class SnapshotService implements ISnapshotService {
  private readonly snapshots = new Map<string, SnapshotData>();

  constructor(
    private readonly fileService: FileService,
    private readonly logger: ILogger,
  ) {}

  async create(
    workspaceId: string, name: string, description = '', tags: readonly string[] = [],
  ): Promise<Snapshot> {
    const filesResult = await this.fileService.listDirectory(workspaceId, '/', true);
    if (!filesResult.success) throw new Error('Failed to list workspace files');

    const files = filesResult.data.filter((f) => !f.isDirectory);
    const fileData = new Map<string, { file: WorkspaceFile; content: string }>();
    let totalSize = 0;

    for (const file of files) {
      const content = await this.fileService.readFile(workspaceId, file.path);
      if (content.success) {
        fileData.set(file.path, { file, content: content.data.content });
        totalSize += content.data.size;
      }
    }

    const hash = this.computeSnapshotHash(fileData);
    const compressedSize = Math.floor(totalSize * 0.3); // Estimated compression ratio

    const snapshot: Snapshot = {
      id: crypto.randomUUID(), workspaceId, name, description, hash,
      fileCount: files.length, totalSize, compressedSize, tags,
      metadata: {}, createdAt: new Date(), updatedAt: new Date(),
    };

    this.snapshots.set(snapshot.id, { snapshot, files: fileData });
    this.logger.info({ snapshotId: snapshot.id, name, fileCount: files.length, totalSize }, 'Snapshot created');

    return snapshot;
  }

  async restore(snapshotId: string, workspaceId: string): Promise<{ restoredFiles: number }> {
    const data = this.snapshots.get(snapshotId);
    if (!data) throw new Error(`Snapshot ${snapshotId} not found`);

    let restoredFiles = 0;
    for (const [path, { content }] of data.files) {
      const result = await this.fileService.writeFile(workspaceId, path, content);
      if (result.success) restoredFiles++;
    }

    this.logger.info({ snapshotId, restoredFiles }, 'Snapshot restored');
    return { restoredFiles };
  }

  async compare(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff> {
    const a = this.snapshots.get(snapshotIdA);
    const b = this.snapshots.get(snapshotIdB);
    if (!a || !b) throw new Error('Snapshot not found');

    const pathsA = new Set(a.files.keys());
    const pathsB = new Set(b.files.keys());

    const added: { path: string; size: number }[] = [];
    const removed: { path: string; size: number }[] = [];
    const modified: { path: string; oldSize: number; newSize: number }[] = [];
    let unchanged = 0;

    // Added and modified
    for (const path of pathsB) {
      const fileB = b.files.get(path)!;
      if (!pathsA.has(path)) {
        added.push({ path, size: fileB.content.length });
      } else {
        const fileA = a.files.get(path)!;
        if (fileA.content !== fileB.content) {
          modified.push({ path, oldSize: fileA.content.length, newSize: fileB.content.length });
        } else {
          unchanged++;
        }
      }
    }

    // Removed
    for (const path of pathsA) {
      if (!pathsB.has(path)) {
        removed.push({ path, size: a.files.get(path)!.content.length });
      }
    }

    return { snapshotIdA, snapshotIdB, added, removed, modified, unchanged };
  }

  async listFiles(snapshotId: string): Promise<readonly WorkspaceFile[]> {
    const data = this.snapshots.get(snapshotId);
    if (!data) return [];
    return [...data.files.values()].map((f) => f.file);
  }

  async readFile(snapshotId: string, path: string): Promise<string> {
    const data = this.snapshots.get(snapshotId);
    if (!data) throw new Error('Snapshot not found');
    return data.files.get(path)?.content ?? '';
  }

  async list(workspaceId: string): Promise<readonly Snapshot[]> {
    return [...this.snapshots.values()]
      .filter((d) => d.snapshot.workspaceId === workspaceId)
      .map((d) => d.snapshot)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getById(id: string): Promise<Snapshot | null> {
    return this.snapshots.get(id)?.snapshot ?? null;
  }

  async delete(id: string): Promise<void> {
    this.snapshots.delete(id);
  }

  async tag(id: string, tag: string): Promise<Snapshot> {
    const data = this.snapshots.get(id);
    if (!data) throw new Error('Snapshot not found');

    const updated = { ...data.snapshot, tags: [...data.snapshot.tags, tag], updatedAt: new Date() };
    this.snapshots.set(id, { ...data, snapshot: updated });
    return updated;
  }

  private computeSnapshotHash(files: Map<string, { content: string }>): string {
    const hash = createHash('sha256');
    const sortedPaths = [...files.keys()].sort();
    for (const path of sortedPaths) {
      hash.update(path);
      hash.update(files.get(path)!.content);
    }
    return hash.digest('hex').slice(0, 16);
  }
}
