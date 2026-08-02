/**
 * Workspace Engine API Routes
 */

import { Hono } from 'hono';
import type { FileService } from '../../workspace/files/file-service.js';
import type { WorkspaceIndexer } from '../../workspace/indexing/indexer.js';
import type { SnapshotService } from '../../workspace/snapshots/snapshot-service.js';
import type { DiffEngine } from '../../workspace/diff/diff-engine.js';
import type { AstParser } from '../../workspace/editors/ast-parser.js';
import type { HybridSearchEngine } from '../../workspace/search/hybrid-search.js';
import { SearchQuerySchema, WriteFileSchema, CreateSnapshotSchema } from '../../workspace/types.js';
import { ErrorCode, createError } from '../../types/index.js';
import type { ILogger } from '../../telemetry/logger.js';

export function createWorkspaceEngineRouter(
  fileService: FileService, indexer: WorkspaceIndexer,
  snapshotService: SnapshotService, diffEngine: DiffEngine,
  parser: AstParser, searchEngine: HybridSearchEngine,
  logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── File Operations ─────────────────────────────────────────────────────

  app.get('/files', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const path = c.req.query('path') ?? '/';
    const recursive = c.req.query('recursive') === 'true';
    const result = await fileService.listDirectory(wsId, path, recursive);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/files/tree', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const result = await fileService.getFileTree(wsId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/files/read', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const path = c.req.query('path') ?? '';
    const result = await fileService.readFile(wsId, path);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/files/write', async (c) => {
    const body = await c.req.json();
    const parsed = WriteFileSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await fileService.writeFile(parsed.data.workspaceId ?? body.workspaceId, parsed.data.path, parsed.data.content, parsed.data);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.delete('/files', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const path = c.req.query('path') ?? '';
    const result = await fileService.deleteFile(wsId, path);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.get('/files/stats', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const result = await fileService.getStats(wsId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Search ──────────────────────────────────────────────────────────────

  app.post('/search', async (c) => {
    const body = await c.req.json();
    const parsed = SearchQuerySchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });

    const result = searchEngine.search(parsed.data);
    return c.json({ success: true, data: result });
  });

  // ─── AST ─────────────────────────────────────────────────────────────────

  app.post('/ast/parse', async (c) => {
    const body = await c.req.json();
    if (!body.content || !body.language) throw createError(ErrorCode.VALIDATION, 'content and language required');
    const result = parser.parse(body.content, body.language, body.filePath ?? 'unknown');
    return c.json({ success: true, data: result });
  });

  app.post('/ast/symbols', async (c) => {
    const body = await c.req.json();
    if (!body.content || !body.language) throw createError(ErrorCode.VALIDATION, 'content and language required');
    const kind = body.kind as any;
    const result = parser.findByKind(body.content, body.language, body.filePath ?? 'unknown', kind ?? 'function');
    return c.json({ success: true, data: result });
  });

  // ─── Indexing ────────────────────────────────────────────────────────────

  app.post('/index', async (c) => {
    const body = await c.req.json();
    const result = await indexer.indexWorkspace(body.workspaceId);
    return c.json({ success: true, data: result });
  });

  app.get('/index/stats', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const result = indexer.getStats(wsId);
    return c.json({ success: true, data: result });
  });

  // ─── Snapshots ───────────────────────────────────────────────────────────

  app.post('/snapshots', async (c) => {
    const body = await c.req.json();
    const parsed = CreateSnapshotSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await snapshotService.create(body.workspaceId, parsed.data.name, parsed.data.description, parsed.data.tags);
    return c.json({ success: true, data: result }, 201);
  });

  app.get('/snapshots', async (c) => {
    const wsId = c.req.query('workspaceId') ?? '';
    const result = await snapshotService.list(wsId);
    return c.json({ success: true, data: result });
  });

  app.post('/snapshots/:id/restore', async (c) => {
    const body = await c.req.json();
    const result = await snapshotService.restore(c.req.param('id'), body.workspaceId);
    return c.json({ success: true, data: result });
  });

  app.post('/snapshots/compare', async (c) => {
    const body = await c.req.json();
    const result = await snapshotService.compare(body.snapshotIdA, body.snapshotIdB);
    return c.json({ success: true, data: result });
  });

  // ─── Diff ────────────────────────────────────────────────────────────────

  app.post('/diff', async (c) => {
    const body = await c.req.json();
    if (!body.oldContent || !body.newContent) throw createError(ErrorCode.VALIDATION, 'oldContent and newContent required');
    const result = diffEngine.diff(body.oldContent, body.newContent, body.oldPath ?? 'old', body.newPath ?? 'new');
    return c.json({ success: true, data: result });
  });

  return app;
}
