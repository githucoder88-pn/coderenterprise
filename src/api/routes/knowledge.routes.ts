/**
 * Knowledge Platform API Routes
 */

import { Hono } from 'hono';
import type { MemoryManager } from '../../knowledge/memory/memory-manager.js';
import type { RetrievalEngine } from '../../knowledge/retrieval/retrieval-engine.js';
import type { IndexManager } from '../../knowledge/indexing/index-manager.js';
import type { Summarizer } from '../../knowledge/summarization/summarizer.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { StoreMemorySchema, IngestSchema, SearchSchema } from '../../knowledge/types.js';

export function createKnowledgeRouter(
  memory: MemoryManager,
  retrieval: RetrievalEngine,
  indexer: IndexManager,
  summarizer: Summarizer,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Memory ─────────────────────────────────────────────────────────────

  app.post('/memory', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = StoreMemorySchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const entry = await memory.store({
      ...parsed.data, userId: user.uid, organizationId: user.organizationId,
      embedding: null, expiresAt: parsed.data.expiresInMs ? new Date(Date.now() + parsed.data.expiresInMs) : null,
      metadata: {}, summary: parsed.data.summary ?? null,
    });
    return c.json({ success: true, data: entry }, 201);
  });

  app.get('/memory/search', async (c) => {
    const user = c.get('user');
    const q = c.req.query('q') ?? '';
    const layer = c.req.query('layer') as any;
    const results = await memory.search(q, user.uid, user.organizationId, layer ? [layer] : undefined);
    return c.json({ success: true, data: results });
  });

  app.get('/memory/stats', async (c) => {
    const user = c.get('user');
    const stats = await memory.getStats(user.uid, user.organizationId);
    return c.json({ success: true, data: stats });
  });

  app.post('/memory/consolidate', async (c) => {
    const user = c.get('user');
    const result = await memory.consolidate(user.uid, user.organizationId);
    return c.json({ success: true, data: result });
  });

  // ─── Ingestion ──────────────────────────────────────────────────────────

  app.post('/ingest', async (c) => {
    const body = await c.req.json();
    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await indexer.ingest(parsed.data);
    return c.json({ success: true, data: result }, 201);
  });

  app.delete('/ingest/:entityId', async (c) => {
    await indexer.remove(c.req.param('entityId'));
    return c.json({ success: true });
  });

  app.get('/ingest/stats', async (c) => {
    const user = c.get('user');
    const stats = indexer.getStats(user.organizationId);
    return c.json({ success: true, data: stats });
  });

  // ─── Retrieval ──────────────────────────────────────────────────────────

  app.post('/search', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = SearchSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await retrieval.search({
      ...parsed.data, userId: user.uid, organizationId: user.organizationId,
    });
    return c.json({ success: true, data: result });
  });

  app.post('/context', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const context = await retrieval.getContext(
      { query: body.query, mode: 'hybrid', organizationId: user.organizationId, userId: user.uid },
      body.maxTokens ?? 4000,
    );
    return c.json({ success: true, data: { context } });
  });

  // ─── Summarization ──────────────────────────────────────────────────────

  app.post('/summarize', async (c) => {
    const body = await c.req.json();
    const result = summarizer.summarize({ content: body.content, maxLength: body.maxLength, style: body.style });
    return c.json({ success: true, data: result });
  });

  // ─── Stats ──────────────────────────────────────────────────────────────

  app.get('/stats', (c) => {
    return c.json({ success: true, data: retrieval.getStats() });
  });

  return app;
}
