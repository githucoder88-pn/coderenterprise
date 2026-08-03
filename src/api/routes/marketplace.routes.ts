/**
 * Marketplace API Routes
 */

import { Hono } from 'hono';
import type { PackageRegistry } from '../../marketplace/registry/package-registry.js';
import type { PublisherService } from '../../marketplace/publishers/publisher-service.js';
import type { RatingService } from '../../marketplace/ratings/rating-service.js';
import type { InstallerService } from '../../marketplace/installers/installer-service.js';
import type { ModerationService } from '../../marketplace/moderation/moderation-service.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, createError } from '../../types/index.js';
import { PublishPackageSchema, PublishVersionSchema, CreateReviewSchema } from '../../marketplace/types.js';

export function createMarketplaceRouter(
  registry: PackageRegistry,
  publishers: PublisherService,
  ratings: RatingService,
  installer: InstallerService,
  _moderation: ModerationService,
  _logger: ILogger,
): Hono {
  const app = new Hono();

  // ─── Search & Browse ────────────────────────────────────────────────────

  app.get('/search', async (c) => {
    const query = c.req.query('q') ?? '';
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const kind = c.req.query('kind') as import('../../marketplace/types.js').ArtifactKind | undefined;
    const category = c.req.query('category');
    const sort = c.req.query('sort') as any;
    const result = await registry.search(query, { kind, category, sort }, { page, limit });
    return c.json({ success: true, data: result });
  });

  app.get('/featured', async (c) => {
    const result = await registry.getFeatured(Number(c.req.query('limit') ?? 10));
    return c.json({ success: true, data: result });
  });

  app.get('/popular', async (c) => {
    const result = await registry.getPopular(Number(c.req.query('limit') ?? 20));
    return c.json({ success: true, data: result });
  });

  app.get('/recent', async (c) => {
    const result = await registry.getRecent(Number(c.req.query('limit') ?? 20));
    return c.json({ success: true, data: result });
  });

  app.get('/categories', async (c) => {
    const categories = [
      { id: 'agents', name: 'Agent Extensions', icon: '🤖', slug: 'agents' },
      { id: 'themes', name: 'Themes', icon: '🎨', slug: 'themes' },
      { id: 'workflows', name: 'Workflows', icon: '⚡', slug: 'workflows' },
      { id: 'prompts', name: 'Prompt Packs', icon: '📝', slug: 'prompts' },
      { id: 'mcp', name: 'MCP Integrations', icon: '🔌', slug: 'mcp' },
      { id: 'tools', name: 'Tools', icon: '🔧', slug: 'tools' },
      { id: 'providers', name: 'Provider Integrations', icon: '☁️', slug: 'providers' },
      { id: 'templates', name: 'Templates', icon: '📋', slug: 'templates' },
      { id: 'automation', name: 'Automation Packs', icon: '🤖', slug: 'automation' },
    ];
    return c.json({ success: true, data: categories });
  });

  app.get('/stats', async (c) => {
    const stats = await registry.getStats();
    return c.json({ success: true, data: stats });
  });

  // ─── Packages ───────────────────────────────────────────────────────────

  app.get('/packages/:id', async (c) => {
    const pkg = await registry.getById(c.req.param('id'));
    if (!pkg) throw createError(ErrorCode.NOT_FOUND, 'Package not found');
    return c.json({ success: true, data: pkg });
  });

  app.get('/packages/:id/versions', async (c) => {
    const versions = await registry.getVersions(c.req.param('id'));
    return c.json({ success: true, data: versions });
  });

  app.get('/packages/:id/reviews', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const result = await ratings.getReviews(c.req.param('id'), { page, limit: 20 });
    return c.json({ success: true, data: result });
  });

  app.get('/packages/:id/rating', async (c) => {
    const [avg, dist] = await Promise.all([
      ratings.getAverageRating(c.req.param('id')),
      ratings.getRatingDistribution(c.req.param('id')),
    ]);
    return c.json({ success: true, data: { average: avg, distribution: dist } });
  });

  // ─── Publishing ─────────────────────────────────────────────────────────

  app.post('/publish', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = PublishPackageSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });

    let publisher = await publishers.getByUserId(user.uid);
    if (!publisher) {
      const created = await publishers.create(user.uid, user.email.split('@')[0] ?? 'user', user.uid, user.email);
      if (!created.success) throw created.error;
      publisher = created.data;
    }

    const result = await registry.publish({
      ...parsed.data, publisherId: publisher.id,
      slug: parsed.data.name, status: 'published', latestVersion: '0.0.0',
      icon: parsed.data.icon ?? null, banner: null, screenshots: [],
      featured: false, verified: false, metadata: {},
      homepage: parsed.data.homepage ?? null,
      repository: parsed.data.repository ?? null,
      monetization: { ...parsed.data.monetization, interval: parsed.data.monetization.interval ?? null, trialDays: parsed.data.monetization.trialDays ?? 0, enterpriseContact: parsed.data.monetization.enterpriseContact ?? null },
    });

    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/packages/:id/versions', async (c) => {
    const body = await c.req.json();
    const parsed = PublishVersionSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const result = await registry.publishVersion(c.req.param('id'), {
      ...parsed.data, manifest: {}, metadata: {},
    });
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  // ─── Installation ───────────────────────────────────────────────────────

  app.post('/packages/:id/install', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await installer.install(c.req.param('id'), body.version ?? 'latest', user.uid);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data });
  });

  app.delete('/packages/:id/install', async (c) => {
    const user = c.get('user');
    const result = await installer.uninstall(c.req.param('id'), user.uid);
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  app.get('/installed', async (c) => {
    const user = c.get('user');
    const installed = await installer.getInstalled(user.uid);
    return c.json({ success: true, data: installed });
  });

  // ─── Reviews ────────────────────────────────────────────────────────────

  app.post('/packages/:id/reviews', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) throw createError(ErrorCode.VALIDATION, 'Invalid input', { errors: parsed.error.flatten() });
    const pkg = await registry.getById(c.req.param('id'));
    if (!pkg) throw createError(ErrorCode.NOT_FOUND, 'Package not found');
    const result = await ratings.review(c.req.param('id'), pkg.latestVersion, user.uid, parsed.data.rating, parsed.data.title, parsed.data.body);
    if (!result.success) throw result.error;
    return c.json({ success: true, data: result.data }, 201);
  });

  app.post('/reviews/:id/helpful', async (c) => {
    const result = await ratings.markHelpful(c.req.param('id'));
    if (!result.success) throw result.error;
    return c.json({ success: true });
  });

  // ─── Publishers ─────────────────────────────────────────────────────────

  app.get('/publishers/:slug', async (c) => {
    const pub = await publishers.getBySlug(c.req.param('slug'));
    if (!pub) throw createError(ErrorCode.NOT_FOUND, 'Publisher not found');
    return c.json({ success: true, data: pub });
  });

  app.get('/publishers/top', async (c) => {
    const result = await publishers.list(Number(c.req.query('limit') ?? 20));
    return c.json({ success: true, data: result });
  });

  return app;
}
