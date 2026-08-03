/**
 * Provider Routes
 *
 * Exposes the provider platform via API endpoints.
 */

import { Hono } from 'hono';
import type { ProviderRouter } from '../../modules/providers/provider-router.js';
import type { ProviderRegistry } from '../../modules/providers/provider-registry.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ProviderRequestSchema } from '../../modules/providers/types.js';
import { ErrorCode, createError } from '../../types/index.js';

export function createProviderRouter(
  router: ProviderRouter,
  registry: ProviderRegistry,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // POST /providers/completions
  app.post('/completions', async (c) => {
    const body = await c.req.json();
    const parsed = ProviderRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid request', { errors: parsed.error.flatten() });
    }

    const provider = c.req.header('x-provider') as any;
    const result = await router.complete(parsed.data, provider);

    return c.json({ success: true, data: result });
  });

  // POST /providers/completions/stream
  app.post('/completions/stream', async (c) => {
    const body = await c.req.json();
    const parsed = ProviderRequestSchema.safeParse({ ...body, stream: true });

    if (!parsed.success) {
      throw createError(ErrorCode.VALIDATION, 'Invalid request', { errors: parsed.error.flatten() });
    }

    const provider = c.req.header('x-provider') as any;
    const stream = await router.stream(parsed.data, provider);

    // Return SSE stream
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of stream) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`),
            );
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      },
    );
  });

  // POST /providers/embeddings
  app.post('/embeddings', async (c) => {
    const body = await c.req.json();
    if (!body.model || !body.input) {
      throw createError(ErrorCode.VALIDATION, 'model and input are required');
    }

    const provider = c.req.header('x-provider') as any;
    const result = await router.embed(body, provider);

    return c.json({ success: true, data: result });
  });

  // POST /providers/images
  app.post('/images', async (c) => {
    const body = await c.req.json();
    if (!body.prompt) {
      throw createError(ErrorCode.VALIDATION, 'prompt is required');
    }

    const provider = c.req.header('x-provider') as any;
    const result = await router.generateImage(body, provider);

    return c.json({ success: true, data: result });
  });

  // POST /providers/tokens/count
  app.post('/tokens/count', async (c) => {
    const body = await c.req.json();
    if (!body.model || !body.messages) {
      throw createError(ErrorCode.VALIDATION, 'model and messages are required');
    }

    const provider = c.req.header('x-provider') as any;
    const count = await router.countTokens(body.model, body.messages, provider);

    return c.json({ success: true, data: { count } });
  });

  // GET /providers
  app.get('/', async (c) => {
    const providers = registry.getAll().map((p) => ({
      name: p.name,
      capabilities: p.capabilities,
    }));

    return c.json({ success: true, data: providers });
  });

  // GET /providers/stats
  app.get('/stats', async (c) => {
    const routerStats = router.getStats();
    const registryStats = registry.getStats();

    return c.json({
      success: true,
      data: {
        router: routerStats,
        providers: registryStats,
      },
    });
  });

  // GET /providers/healthy
  app.get('/healthy', async (c) => {
    const healthy = registry.getHealthy().map((p) => p.name);
    return c.json({ success: true, data: { providers: healthy } });
  });

  return app;
}
