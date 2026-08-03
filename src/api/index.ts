/**
 * API Router
 *
 * Central route registry that mounts all domain routers.
 */

import { Hono } from 'hono';
import type { ServiceProvider } from '../providers/service.provider.js';
import type { IAuthClient } from '../infrastructure/firebase/auth-client.js';
import type { IRedisClient } from '../infrastructure/redis/redis-client.js';
import type { ILogger } from '../telemetry/logger.js';
import type { IMetrics } from '../telemetry/metrics.js';
import type { AppConfig } from '../config/index.js';

import { authMiddleware } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createUserRouter } from './routes/users.routes.js';
import { createOrganizationRouter } from './routes/organizations.routes.js';
import { createApiKeyRouter } from './routes/apikeys.routes.js';
import { createAuditRouter } from './routes/audit.routes.js';
import { createSecretsRouter } from './routes/secrets.routes.js';
import { createBillingRouter } from './routes/billing.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createAnalyticsRouter } from './routes/analytics.routes.js';
import { createProviderRouter } from './routes/providers.routes.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';
import { createWorkspaceRouter } from './routes/workspaces.routes.js';
import { createConversationRouter } from './routes/conversations.routes.js';
import { createModelRouter } from './routes/models.routes.js';
import { createWebhookRouter } from './routes/webhooks.routes.js';
import { createNotificationRouter } from './routes/notifications.routes.js';
import { createPromptRouter } from './routes/prompts.routes.js';

export function createApiRouter(
  services: ServiceProvider,
  authClient: IAuthClient,
  redis: IRedisClient,
  logger: ILogger,
  metrics: IMetrics,
  config: AppConfig,
): Hono {
  const api = new Hono();

  // Strict rate limit for auth endpoints to prevent brute-force attacks
  api.use(
    '/auth/*',
    rateLimitMiddleware(redis, logger, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,     // 10 requests per minute
      keyPrefix: 'rl:auth:',
    })
  );

  // Mount domain routers
  api.route('/auth', createAuthRouter(services.auth, services.audit, logger));
  api.route('/health', createHealthRouter(services.health));
  api.route('/providers', createProviderRouter(services.providers.router, services.providers.registry, logger));

  // Protected routes
  api.use('*', authMiddleware(authClient, services.rbac));

  api.route('/users', createUserRouter(services.users, logger));
  api.route('/organizations', createOrganizationRouter(services.organizations, logger));
  api.route('/api-keys', createApiKeyRouter(services.apiKeys, logger));
  api.route('/audit', createAuditRouter(services.audit, logger));
  api.route('/secrets', createSecretsRouter(services.secrets, logger));
  api.route('/billing', createBillingRouter(services.billing, logger));
  api.route('/analytics', createAnalyticsRouter(services.analytics, logger));
  api.route('/workspaces', createWorkspaceRouter(services.workspaces, logger));
  api.route('/conversations', createConversationRouter(services.conversations, logger));
  api.route('/models', createModelRouter(services.models, logger));
  api.route('/webhooks', createWebhookRouter(services.webhooks, logger));
  api.route('/notifications', createNotificationRouter(services.notifications, logger));
  api.route('/prompts', createPromptRouter(services.prompts, logger));
  api.route('/dashboard', createDashboardRouter(services, logger));

  // Metrics endpoint
  api.get('/metrics', (c) => {
    return c.json(metrics.snapshot());
  });

  return api;
}
