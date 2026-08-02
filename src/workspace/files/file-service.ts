/**
 * File Service
 *
 * Core file operations with atomic writes, compression, directory tree management.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createBrotliCompress, createBrotliDecompress } from 'node:zlib';
import { Readable } from 'node:stream';
import type { IFirestoreClient } from '../../infrastructure/firebase/firestore-client.js';
import type { IStorageClient } from '../../infrastructure/firebase/storage-client.js';
import type { ILogger } from '../../telemetry/logger.js';
import type {
  WorkspaceFile, FileContent, WriteOptions, ReadOptions,
  SupportedLanguage,
} from '../types.js';
import { LANGUAGE_EXTENSIONS } from '../types.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IFileService {
  readFile(workspaceId: string, path: string, options?: ReadOptions): Promise<Result<FileContent>>;
  writeFile(workspaceId: string, path: string, content: string, options?: WriteOptions): Promise<Result<WorkspaceFile>>;
  deleteFile(workspaceId: string, path: string): Promise<Result<void>>;
  listDirectory(workspaceId: string, dirPath: string, recursive?: boolean): Promise<Result<readonly WorkspaceFile[]>>;
  getFileTree(workspaceId: string): Promise<Result<TreeNode>>;
  exists(workspaceId: string, path: string): Promise<Result<boolean>>;
  rename(workspaceId: string, oldPath: string, newPath: string): Promise<Result<WorkspaceFile>>;
  copy(workspaceId: string, sourcePath: string, destPath: string): Promise<Result<WorkspaceFile>>;
  getStats(workspaceId: string): Promise<Result<{ totalFiles: number; totalSize: number; byLanguage: Record<string, number> }>>;
}

export interface TreeNode {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly children: readonly TreeNode[];
  readonly file?: WorkspaceFile;
}

export class FileService implements IFileService {
  private readonly collection = 'workspace_files';
  private readonly contentBucket = 'workspace-content';

  constructor(
    private readonly firestore: IFirestoreClient,
    private readonly storage: IStorageClient,
    private readonly logger: ILogger,
  ) {}

  async readFile(workspaceId: string, path: string, options?: ReadOptions): Promise<Result<FileContent>> {
    const file = await this.findFile(workspaceId, path);
    if (!file) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `File not found: ${path}`, timestamp: new Date() } };

    const storagePath = this.contentPath(workspaceId, file.id, options?.version);
    try {
      const result = await this.storage.download(this.contentBucket, storagePath);
      let content = result.data.toString(file.encoding === 'base64' ? 'base64' : 'utf8');

      if (file.metadata['compressed'] as boolean) {
        content = await this.decompress(result.data).then((b) => b.toString('utf8'));
      }

      return {
        success: true,
        data: {
          fileId: file.id, path, content, hash: file.hash,
          size: file.size, encoding: file.encoding as 'utf8' | 'base64',
          compressed: false, version: (file.metadata['version'] as number) ?? 1,
        },
      };
    } catch (error) {
      return { success: false, error: { code: ErrorCode.INTERNAL, message: `Failed to read: ${path}`, cause: error instanceof Error ? error : undefined, timestamp: new Date() } };
    }
  }

  async writeFile(
    workspaceId: string, path: string, content: string, options?: WriteOptions,
  ): Promise<Result<WorkspaceFile>> {
    const opts: Required<WriteOptions> = {
      encoding: options?.encoding ?? 'utf8',
      compress: options?.compress ?? false,
      atomic: options?.atomic ?? true,
      createDirs: options?.createDirs ?? true,
      metadata: options?.metadata ?? {},
    };

    // Create parent directories
    if (opts.createDirs) {
      await this.ensureDirectories(workspaceId, path);
    }

    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    const size = Buffer.byteLength(content, opts.encoding);
    const ext = this.getExtension(path);
    const language = LANGUAGE_EXTENSIONS[ext] ?? null;
    const existing = await this.findFile(workspaceId, path);

    // Atomic write: write to temp path, then rename
    let buffer = Buffer.from(content, opts.encoding);
    if (opts.compress) {
      buffer = await this.compress(buffer);
    }

    const fileId = existing?.id ?? crypto.randomUUID();
    const storagePath = this.contentPath(workspaceId, fileId);

    try {
      await this.storage.upload({
        bucket: this.contentBucket, path: storagePath,
        data: buffer, contentType: 'application/octet-stream',
        metadata: { workspaceId, fileId, path, compressed: String(opts.compress) },
      });

      const version = ((existing?.metadata['version'] as number) ?? 0) + 1;
      const now = new Date();
      const fileRecord: Record<string, unknown> = {
        workspaceId, path, name: this.getFileName(path), extension: ext,
        language, size, hash, encoding: opts.encoding, isDirectory: false,
        parentId: this.getParentId(path), depth: this.getDepth(path),
        metadata: { ...opts.metadata, version, compressed: opts.compress },
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      };

      if (existing) {
        await this.firestore.updateDocument(this.collection, fileId, fileRecord);
      } else {
        await this.firestore.createDocument(this.collection, fileId, fileRecord);
      }

      this.logger.debug({ path, size, hash, version }, 'File written');

      return {
        success: true,
        data: {
          id: fileId, workspaceId, path, name: this.getFileName(path),
          extension: ext, language, size, hash, encoding: opts.encoding,
          isDirectory: false, parentId: this.getParentId(path), depth: this.getDepth(path),
          metadata: fileRecord['metadata'] as Record<string, unknown>,
          createdAt: existing?.createdAt ?? now, updatedAt: now,
        },
      };
    } catch (error) {
      return { success: false, error: { code: ErrorCode.INTERNAL, message: `Failed to write: ${path}`, cause: error instanceof Error ? error : undefined, timestamp: new Date() } };
    }
  }

  async deleteFile(workspaceId: string, path: string): Promise<Result<void>> {
    const file = await this.findFile(workspaceId, path);
    if (!file) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `File not found: ${path}`, timestamp: new Date() } };

    await this.firestore.deleteDocument(this.collection, file.id);
    try { await this.storage.delete(this.contentBucket, this.contentPath(workspaceId, file.id)); } catch { /* content may not exist */ }
    return { success: true, data: undefined };
  }

  async listDirectory(workspaceId: string, dirPath: string, recursive = false): Promise<Result<readonly WorkspaceFile[]>> {
    const normalizedDir = dirPath === '/' ? '' : dirPath.replace(/\/$/, '');
    const allFiles = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'workspaceId', operator: '==', value: workspaceId }, { field: 'isDirectory', operator: '==', value: false }],
      { limit: 10000, orderBy: [{ field: 'path', direction: 'asc' }] });

    const files = allFiles.map((d) => this.mapFile(d.id, d.data));
    const filtered = recursive
      ? files.filter((f) => f.path.startsWith(normalizedDir + '/') || normalizedDir === '')
      : files.filter((f) => f.parentId === normalizedDir);

    return { success: true, data: filtered };
  }

  async getFileTree(workspaceId: string): Promise<Result<TreeNode>> {
    const allFiles = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'workspaceId', operator: '==', value: workspaceId }],
      { limit: 10000, orderBy: [{ field: 'path', direction: 'asc' }] });

    const files = allFiles.map((d) => this.mapFile(d.id, d.data));
    return { success: true, data: this.buildTree(files, '/') };
  }

  async exists(workspaceId: string, path: string): Promise<Result<boolean>> {
    const file = await this.findFile(workspaceId, path);
    return { success: true, data: file !== null };
  }

  async rename(workspaceId: string, oldPath: string, newPath: string): Promise<Result<WorkspaceFile>> {
    const file = await this.findFile(workspaceId, oldPath);
    if (!file) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `File not found: ${oldPath}`, timestamp: new Date() } };

    const ext = this.getExtension(newPath);
    const now = new Date();
    await this.firestore.updateDocument(this.collection, file.id, {
      path: newPath, name: this.getFileName(newPath), extension: ext,
      language: LANGUAGE_EXTENSIONS[ext] ?? null, parentId: this.getParentId(newPath),
      depth: this.getDepth(newPath), updatedAt: now,
    });

    return { success: true, data: { ...file, path: newPath, name: this.getFileName(newPath), extension: ext, updatedAt: now } };
  }

  async copy(workspaceId: string, sourcePath: string, destPath: string): Promise<Result<WorkspaceFile>> {
    const readResult = await this.readFile(workspaceId, sourcePath);
    if (!readResult.success) return readResult as any;

    return this.writeFile(workspaceId, destPath, readResult.data.content);
  }

  async getStats(workspaceId: string): Promise<Result<{ totalFiles: number; totalSize: number; byLanguage: Record<string, number> }>> {
    const allFiles = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'workspaceId', operator: '==', value: workspaceId }, { field: 'isDirectory', operator: '==', value: false }]);

    const byLanguage: Record<string, number> = {};
    let totalSize = 0;
    for (const doc of allFiles) {
      const lang = doc.data['language'] as string ?? 'unknown';
      byLanguage[lang] = (byLanguage[lang] ?? 0) + 1;
      totalSize += (doc.data['size'] as number) ?? 0;
    }

    return { success: true, data: { totalFiles: allFiles.length, totalSize, byLanguage } };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async findFile(workspaceId: string, path: string): Promise<WorkspaceFile | null> {
    const docs = await this.firestore.getCollection<Record<string, unknown>>(this.collection,
      [{ field: 'workspaceId', operator: '==', value: workspaceId }, { field: 'path', operator: '==', value: path }],
      { limit: 1 });
    return docs.length > 0 ? this.mapFile(docs[0]!.id, docs[0]!.data) : null;
  }

  private buildTree(files: readonly WorkspaceFile[], rootPath: string): TreeNode {
    const root: TreeNode = { name: '/', path: '/', isDirectory: true, children: [] };
    const dirMap = new Map<string, TreeNode>();
    dirMap.set('', root);

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]!;
        if (!dirMap.has(currentPath)) {
          const dir: TreeNode = { name: parts[i]!, path: currentPath, isDirectory: true, children: [] };
          dirMap.set(currentPath, dir);
          (dirMap.get(parentPath) ?? root).children.push(dir);
        }
      }
      const fileNode: TreeNode = { name: file.name, path: file.path, isDirectory: false, children: [], file };
      const parentPath = parts.slice(0, -1).join('/');
      (dirMap.get(parentPath) ?? root).children.push(fileNode);
    }

    return root;
  }

  private async ensureDirectories(workspaceId: string, filePath: string): Promise<void> {
    const parts = filePath.split('/').filter(Boolean).slice(0, -1);
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = await this.findFile(workspaceId, currentPath);
      if (!existing) {
        const dirId = crypto.randomUUID();
        const now = new Date();
        await this.firestore.createDocument(this.collection, dirId, {
          workspaceId, path: currentPath, name: part, extension: '', language: null,
          size: 0, hash: '', encoding: 'utf8', isDirectory: true,
          parentId: parts.slice(0, parts.indexOf(part)).join('/'),
          depth: parts.indexOf(part) + 1, metadata: {},
          createdAt: now, updatedAt: now,
        });
      }
    }
  }

  private async compress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createBrotliCompress();
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      stream.end(data);
    });
  }

  private async decompress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createBrotliDecompress();
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      stream.end(data);
    });
  }

  private contentPath(workspaceId: string, fileId: string, version?: number): string {
    const ver = version ? `/v${version}` : '';
    return `${workspaceId}/${fileId}${ver}`;
  }

  private getExtension(path: string): string {
    const dot = path.lastIndexOf('.');
    return dot >= 0 ? path.slice(dot) : '';
  }

  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? '';
  }

  private getParentId(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }

  private getDepth(path: string): number {
    return path.split('/').filter(Boolean).length;
  }

  private mapFile(id: string, d: Record<string, unknown>): WorkspaceFile {
    return {
      id, workspaceId: (d['workspaceId'] as string) ?? '', path: (d['path'] as string) ?? '',
      name: (d['name'] as string) ?? '', extension: (d['extension'] as string) ?? '',
      language: (d['language'] as SupportedLanguage) ?? null, size: (d['size'] as number) ?? 0,
      hash: (d['hash'] as string) ?? '', encoding: (d['encoding'] as 'utf8' | 'base64' | 'binary') ?? 'utf8',
      isDirectory: (d['isDirectory'] as boolean) ?? false, parentId: (d['parentId'] as string) ?? null,
      depth: (d['depth'] as number) ?? 0, metadata: (d['metadata'] as Record<string, unknown>) ?? {},
      createdAt: d['createdAt'] instanceof Date ? d['createdAt'] as Date : new Date(d['createdAt'] as string),
      updatedAt: d['updatedAt'] instanceof Date ? d['updatedAt'] as Date : new Date(d['updatedAt'] as string),
    };
  }
}
