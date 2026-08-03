/**
 * Application Factory
 *
 * Creates and configures the Hono application with all middleware and routes.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { AppConfig } from './config/index.js';
import { createLogger, type ILogger } from './telemetry/logger.js';
import { MetricsCollector, type IMetrics } from './telemetry/metrics.js';
import { createRedisProvider, type RedisProvider } from './providers/redis.provider.js';
import { createFirebaseProvider, type FirebaseProvider } from './providers/firebase.provider.js';
import { createServiceProvider, type ServiceProvider } from './providers/service.provider.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import { securityHeadersMiddleware } from './middleware/security-headers.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { createApiRouter } from './api/index.js';

export interface AppContext {
  readonly app: Hono;
  readonly services: ServiceProvider;
  readonly redis: RedisProvider;
  readonly firebase: FirebaseProvider;
  readonly logger: ILogger;
  readonly metrics: IMetrics;
  readonly config: AppConfig;
  readonly server: ReturnType<typeof serve> | null;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createApp(config: AppConfig): AppContext {
  // Core dependencies
  const logger = createLogger({
    level: config.logging.level,
    pretty: config.logging.pretty,
    name: 'coderenterprise',
  });

  const metrics = new MetricsCollector();

  // Infrastructure providers
  const redis = createRedisProvider(config.redis, logger);
  const firebase = createFirebaseProvider(config.firebase, logger);

  // Domain services
  const services = createServiceProvider(config, logger, metrics, redis, firebase);

  // Hono application
  const app = new Hono();

  // Global middleware (order matters)
  app.use('*', requestIdMiddleware);
  app.use('*', errorHandlerMiddleware(logger));
  app.use('*', securityHeadersMiddleware);
  app.use('*', corsMiddleware(config.cors.origins, config.cors.credentials));
  app.use('*', requestLoggerMiddleware(logger, metrics));

  // Rate limiting on API routes
  app.use(
    `${config.api.prefix}/*`,
    rateLimitMiddleware(redis.redis, logger, {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
    }),
  );

  // Mount API router
  const apiRouter = createApiRouter(
    services,
    firebase.auth,
    redis,
    logger,
    metrics,
    config,
    firebase,
  );
  app.route(config.api.prefix, apiRouter);

  // Root health check (no auth required)
  app.get('/health', async (c) => {
    const result = await services.health.shallow();
    return c.json({ success: true, data: result.success ? result.data : { status: 'unknown', uptime: 0 } });
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` },
      },
      404,
    );
  });

  let server: ReturnType<typeof serve> | null = null;

  return {
    app,
    services,
    redis,
    firebase,
    logger,
    metrics,
    config,
    get server() { return server; },

    async start() {
      // Connect infrastructure
      logger.info('Connecting to Redis...');
      await redis.connect();

      logger.info('Starting HTTP server...');
      server = serve({
        fetch: app.fetch,
        port: config.node.port,
        hostname: config.node.host,
      });

      logger.info(
        { host: config.node.host, port: config.node.port, env: config.node.env },
        `CODER Enterprise backend running on ${config.node.host}:${config.node.port}`,
      );
    },

    async stop() {
      logger.info('Shutting down...');
      if (server) {
        server.close();
      }
      await redis.disconnect();
      logger.info('Shutdown complete');
    },
  };
}
