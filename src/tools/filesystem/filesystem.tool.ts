/**
 * Filesystem Tools
 *
 * File CRUD operations scoped to workspace directory.
 */

import { readFile, writeFile, mkdir, rename, rm, copyFile, stat, readdir } from 'node:fs/promises';
import { join, dirname, resolve, sep } from 'node:path';
import type {
  Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult, ToolArtifact,
} from '../types.js';
import {
  CreateFileSchema, ReadFileSchema, UpdateFileSchema, DeleteFileSchema,
  RenameFileSchema, CopyFileSchema, MoveFileSchema,
} from '../types.js';

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null, artifacts: ToolArtifact[] = []): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'filesystem', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts };
}

function safePath(base: string, target: string): string {
  const resolved = resolve(base, target);
  const resolvedBase = resolve(base);
  const baseWithSep = resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep;
  if (resolved !== resolvedBase && !resolved.startsWith(baseWithSep)) throw new Error(`Path traversal detected: ${target}`);
  return resolved;
}

// ─── Create File ─────────────────────────────────────────────────────────────

export class CreateFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.createFile', name: 'Create File', category: 'filesystem',
    description: 'Create a new file with content',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:write'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = CreateFileSchema.parse(input);
    const filePath = safePath(ctx.workingDirectory, parsed.path);
    await mkdir(dirname(filePath), { recursive: true });
    if (!parsed.overwrite) {
      try { await stat(filePath); return makeResult(ctx, false, null, `File already exists: ${parsed.path}`); } catch { /* ok */ }
    }
    await writeFile(filePath, parsed.content, parsed.encoding);
    return makeResult(ctx, true, { path: parsed.path, size: Buffer.byteLength(parsed.content) });
  }
}

// ─── Read File ───────────────────────────────────────────────────────────────

export class ReadFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.readFile', name: 'Read File', category: 'filesystem',
    description: 'Read file contents',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:read'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = ReadFileSchema.parse(input);
    const filePath = safePath(ctx.workingDirectory, parsed.path);
    const content = await readFile(filePath, { encoding: parsed.encoding as BufferEncoding });
    const fileStat = await stat(filePath);
    const text = content as string;
    const sliced = parsed.offset !== undefined || parsed.limit !== undefined
      ? text.slice(parsed.offset ?? 0, (parsed.offset ?? 0) + (parsed.limit ?? text.length))
      : text;
    return makeResult(ctx, true, { path: parsed.path, content: sliced, size: fileStat.size, encoding: parsed.encoding });
  }
}

// ─── Update File ─────────────────────────────────────────────────────────────

export class UpdateFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.updateFile', name: 'Update File', category: 'filesystem',
    description: 'Update file content via replacement or append',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:write'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = UpdateFileSchema.parse(input);
    const filePath = safePath(ctx.workingDirectory, parsed.path);
    let content = await readFile(filePath, 'utf8');

    if (parsed.replacements) {
      for (const r of parsed.replacements) {
        content = r.all ? content.replaceAll(r.search, r.replace) : content.replace(r.search, r.replace);
      }
    }
    if (parsed.content !== undefined) content = parsed.content;
    if (parsed.append) content += parsed.append;

    await writeFile(filePath, content, 'utf8');
    return makeResult(ctx, true, { path: parsed.path, size: content.length });
  }
}

// ─── Delete File ─────────────────────────────────────────────────────────────

export class DeleteFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.deleteFile', name: 'Delete File', category: 'filesystem',
    description: 'Delete a file or directory',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:delete'],
    timeout: 10_000, requiresConfirmation: true, dangerous: true, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = DeleteFileSchema.parse(input);
    const filePath = safePath(ctx.workingDirectory, parsed.path);
    await rm(filePath, { recursive: parsed.recursive, force: false });
    return makeResult(ctx, true, { path: parsed.path, deleted: true });
  }
}

// ─── Rename File ─────────────────────────────────────────────────────────────

export class RenameFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.renameFile', name: 'Rename File', category: 'filesystem',
    description: 'Rename a file or directory',
    inputSchema: { type: 'object', properties: { oldPath: { type: 'string' }, newPath: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:write'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = RenameFileSchema.parse(input);
    const oldPath = safePath(ctx.workingDirectory, parsed.oldPath);
    const newPath = safePath(ctx.workingDirectory, parsed.newPath);
    await rename(oldPath, newPath);
    return makeResult(ctx, true, { oldPath: parsed.oldPath, newPath: parsed.newPath });
  }
}

// ─── Copy File ───────────────────────────────────────────────────────────────

export class CopyFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.copyFile', name: 'Copy File', category: 'filesystem',
    description: 'Copy a file to a new location',
    inputSchema: { type: 'object', properties: { source: { type: 'string' }, destination: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:read', 'filesystem:write'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = CopyFileSchema.parse(input);
    const src = safePath(ctx.workingDirectory, parsed.source);
    const dest = safePath(ctx.workingDirectory, parsed.destination);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    return makeResult(ctx, true, { source: parsed.source, destination: parsed.destination });
  }
}

// ─── Move File ───────────────────────────────────────────────────────────────

export class MoveFileTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.moveFile', name: 'Move File', category: 'filesystem',
    description: 'Move a file to a new location',
    inputSchema: { type: 'object', properties: { source: { type: 'string' }, destination: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['filesystem:write'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = MoveFileSchema.parse(input);
    const src = safePath(ctx.workingDirectory, parsed.source);
    const dest = safePath(ctx.workingDirectory, parsed.destination);
    await mkdir(dirname(dest), { recursive: true });
    await rename(src, dest);
    return makeResult(ctx, true, { source: parsed.source, destination: parsed.destination });
  }
}

// ─── List Directory ──────────────────────────────────────────────────────────

export class ListDirectoryTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'fs.listDirectory', name: 'List Directory', category: 'filesystem',
    description: 'List files in a directory',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
    outputSchema: { type: 'array' }, permissions: ['filesystem:read'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const dirPath = safePath(ctx.workingDirectory, (input as any).path ?? '.');
    const entries = await readdir(dirPath, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (e) => {
      const fullPath = join(dirPath, e.name);
      try {
        const s = await stat(fullPath);
        return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size: s.size, modified: s.mtime.toISOString() };
      } catch {
        return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', size: 0, modified: null };
      }
    }));
    return makeResult(ctx, true, items);
  }
}

export const FILESYSTEM_TOOLS = [
  new CreateFileTool(), new ReadFileTool(), new UpdateFileTool(),
  new DeleteFileTool(), new RenameFileTool(), new CopyFileTool(),
  new MoveFileTool(), new ListDirectoryTool(),
];
