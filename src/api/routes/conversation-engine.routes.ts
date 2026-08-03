/**
 * Conversation Engine API Routes
 */

import { Hono } from 'hono';
import type { ConversationService } from '../../conversations/engine/conversation-service.js';
import type { Orchestrator } from '../../conversations/engine/orchestrator.js';
import type { MemoryService } from '../../conversations/engine/memory-service.js';
import type { SessionManager } from '../../conversations/engine/session-manager.js';
import type { PromptTemplateService } from '../../conversations/engine/prompt-templates.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { CreateConversationSchema, MemoryStoreSchema, CreateBranchSchema, CreateCheckpointSchema } from '../../conversations/engine/types.js';

export function createConversationEngineRouter(
  conversations: ConversationService,
  orchestrator: Orchestrator,
  memory: MemoryService,
  sessions: SessionManager,
  prompts: PromptTemplateService,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Conversations ─────────────────────────────────────────────────────

  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateConversationSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const actor = c.get('user');
    const result = await conversations.create(parsed.data, actor);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.get('/', async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const result = await conversations.list(user.uid, { page, limit });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id', async (c) => {
    const result = await conversations.get(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.get('/:id/messages', async (c) => {
    const limit = Number(c.req.query('limit') ?? 100);
    const branchId = c.req.query('branchId') ?? undefined;
    const result = await conversations.getMessages(c.req.param('id'), branchId, limit);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  // ─── Send Message (Orchestrated) ───────────────────────────────────────

  app.post('/:id/send', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');
    const result = await orchestrator.send({
      conversationId: c.req.param('id'), userId: user.uid, organizationId: user.organizationId,
      message: body.content, model: body.model, provider: body.provider,
      temperature: body.temperature, maxTokens: body.maxTokens, stream: false,
    });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/:id/send/stream', async (c) => {
    const body = await c.req.json();
    const user = c.get('user');

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const result = await orchestrator.sendStreaming(
              {
                conversationId: c.req.param('id'), userId: user.uid, organizationId: user.organizationId,
                message: body.content, model: body.model, provider: body.provider,
                temperature: body.temperature, maxTokens: body.maxTokens, stream: true,
              },
              {
                onContent: (delta) => {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', delta })}\n\n`));
                },
                onComplete: (stream) => {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: stream.content, usage: stream.usage })}\n\n`));
                  controller.close();
                },
                onError: (error) => {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
                  controller.close();
                },
              },
            );
            if (!result.success) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: result.error.message })}\n\n`));
              controller.close();
            }
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`));
            controller.close();
          }
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } },
    );
  });

  // ─── Message Operations ────────────────────────────────────────────────

  app.patch('/messages/:messageId', async (c) => {
    const body = await c.req.json();
    const result = await conversations.editMessage(c.req.param('messageId'), body.content, body.createBranch);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/messages/:messageId/rate', async (c) => {
    const body = await c.req.json();
    const result = await conversations.rateMessage(c.req.param('messageId'), body.rating, body.feedback);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Branches ──────────────────────────────────────────────────────────

  app.post('/:id/branches', async (c) => {
    const body = await c.req.json();
    const parsed = CreateBranchSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await conversations.createBranch(c.req.param('id'), parsed.data.name, parsed.data.forkMessageId);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.get('/:id/branches', async (c) => {
    const result = await conversations.listBranches(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/:id/branches/:branchId/switch', async (c) => {
    const result = await conversations.switchBranch(c.req.param('id'), c.req.param('branchId'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Checkpoints ───────────────────────────────────────────────────────

  app.post('/:id/checkpoints', async (c) => {
    const body = await c.req.json();
    const parsed = CreateCheckpointSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await conversations.createCheckpoint(c.req.param('id'), parsed.data.name, parsed.data.description);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.get('/:id/checkpoints', async (c) => {
    const result = await conversations.listCheckpoints(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.post('/checkpoints/:checkpointId/restore', async (c) => {
    const result = await conversations.restoreCheckpoint(c.req.param('checkpointId'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Memory ────────────────────────────────────────────────────────────

  app.post('/memory', async (c) => {
    const body = await c.req.json();
    const parsed = MemoryStoreSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const user = c.get('user');
    const result = await memory.store({
      ...parsed.data, userId: user.uid, organizationId: user.organizationId,
      summary: null, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      metadata: {}, conversationId: parsed.data.conversationId ?? null,
    });
    return c.json({ success: true, data: result }, 201);
  });

  app.get('/memory', async (c) => {
    const user = c.get('user');
    const query = c.req.query('q') ?? '';
    const type = c.req.query('type') as any;
    const result = await memory.retrieve({ userId: user.uid, organizationId: user.organizationId, query, type, maxResults: 50 });
    return c.json({ success: true, data: result });
  });

  app.get('/memory/stats', async (c) => {
    const user = c.get('user');
    const result = await memory.getStats(user.uid);
    return c.json({ success: true, data: result });
  });

  // ─── Sessions ──────────────────────────────────────────────────────────

  app.get('/sessions', async (c) => {
    const user = c.get('user');
    const result = await sessions.getByUser(user.uid);
    return c.json({ success: true, data: result });
  });

  // ─── Prompt Templates ──────────────────────────────────────────────────

  app.get('/prompts/templates', async (c) => {
    const user = c.get('user');
    const category = c.req.query('category') ?? undefined;
    const result = await prompts.list(user.organizationId, category);
    return c.json({ success: true, data: result });
  });

  app.get('/prompts/templates/public', async (c) => {
    const category = c.req.query('category') ?? undefined;
    const result = await prompts.listPublic(category);
    return c.json({ success: true, data: result });
  });

  app.post('/prompts/templates/:id/render', async (c) => {
    const body = await c.req.json();
    const result = await prompts.render(c.req.param('id'), body.variables ?? {});
    return c.json({ success: true, data: { rendered: result } });
  });

  return app;
}
