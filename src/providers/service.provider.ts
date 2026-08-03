/**
 * Service Provider
 *
 * Wires up all domain services with their dependencies.
 * Central composition root.
 */

import type { AppConfig } from '../config/index.js';
import type { ILogger } from '../telemetry/logger.js';
import type { IMetrics } from '../telemetry/metrics.js';
import type { RedisProvider } from './redis.provider.js';
import type { FirebaseProvider } from './firebase.provider.js';
import { EventBus, type IEventBus } from '../core/event-bus.js';

import { AuthService, type IAuthService } from '../modules/auth/auth.service.js';
import { UserService, type IUserService } from '../modules/users/user.service.js';
import { OrganizationService, type IOrganizationService } from '../modules/organizations/organization.service.js';
import { ApiKeyService, type IApiKeyService } from '../modules/apikeys/apikey.service.js';
import { AuditService, type IAuditService } from '../modules/audit/audit.service.js';
import { AnalyticsService, type IAnalyticsService } from '../modules/analytics/analytics.service.js';
import { BillingService, type IBillingService } from '../modules/billing/billing.service.js';
import { SecretsService, type ISecretsService } from '../modules/secrets/secrets.service.js';
import { HealthService, type IHealthService } from '../modules/health/health.service.js';
import { RBACService, type IRBACService } from '../modules/rbac/rbac.service.js';
import { createProviderPlatform, type ProviderPlatform } from '../modules/providers/provider-factory.js';
import { WorkspaceService, type IWorkspaceService } from '../modules/workspaces/workspace.service.js';
import { TeamService, type ITeamService } from '../modules/teams/team.service.js';
import { ConversationService, type IConversationService } from '../modules/conversations/conversation.service.js';
import { PromptService, type IPromptService } from '../modules/prompts/prompt.service.js';
import { NotificationService, type INotificationService } from '../modules/notifications/notification.service.js';
import { ExtensionService, type IExtensionService } from '../modules/extensions/extension.service.js';
import { ModelRegistryService, type IModelRegistryService } from '../modules/models/model.service.js';
import { WebhookService, type IWebhookService } from '../modules/webhooks/webhook.service.js';
import { PaymentService, type IPaymentService } from '../modules/payments/payment.service.js';

import { UserRepository } from '../modules/users/user.repository.js';
import { OrganizationRepository } from '../modules/organizations/organization.repository.js';
import { ApiKeyRepository } from '../modules/apikeys/apikey.repository.js';
import { AuditRepository } from '../modules/audit/audit.repository.js';
import { WorkspaceRepository } from '../modules/workspaces/workspace.repository.js';
import { ConversationRepository } from '../modules/conversations/conversation.repository.js';
import { ModelRepository } from '../modules/models/model.repository.js';

export interface ServiceProvider {
  readonly eventBus: IEventBus;
  readonly auth: IAuthService;
  readonly users: IUserService;
  readonly organizations: IOrganizationService;
  readonly apiKeys: IApiKeyService;
  readonly audit: IAuditService;
  readonly analytics: IAnalyticsService;
  readonly billing: IBillingService;
  readonly secrets: ISecretsService;
  readonly health: IHealthService;
  readonly rbac: IRBACService;
  readonly providers: ProviderPlatform;
  readonly workspaces: IWorkspaceService;
  readonly teams: ITeamService;
  readonly conversations: IConversationService;
  readonly prompts: IPromptService;
  readonly notifications: INotificationService;
  readonly extensions: IExtensionService;
  readonly models: IModelRegistryService;
  readonly webhooks: IWebhookService;
  readonly payments: IPaymentService;
}

export function createServiceProvider(
  config: AppConfig,
  logger: ILogger,
  metrics: IMetrics,
  redis: RedisProvider,
  firebase: FirebaseProvider,
): ServiceProvider {
  const eventBus = new EventBus();

  // Repositories
  const userRepo = new UserRepository(firebase.firestore);
  const orgRepo = new OrganizationRepository(firebase.firestore);
  const apiKeyRepo = new ApiKeyRepository(firebase.firestore);
  const auditRepo = new AuditRepository(firebase.firestore);

  // Services
  const rbac = new RBACService(logger, eventBus);
  const audit = new AuditService(auditRepo, logger, eventBus);
  const analytics = new AnalyticsService(redis.cache, logger, eventBus, metrics);
  const billing = new BillingService(logger, eventBus, analytics);
  const secrets = new SecretsService(
    firebase.firestore,
    redis.cache,
    config.encryption.key,
    logger,
    eventBus,
  );
  const auth = new AuthService(
    firebase.auth,
    audit,
    logger,
    eventBus,
  );
  const users = new UserService(
    userRepo,
    firebase.auth,
    audit,
    logger,
    eventBus,
  );
  const organizations = new OrganizationService(
    orgRepo,
    audit,
    logger,
    eventBus,
  );
  const apiKeys = new ApiKeyService(
    apiKeyRepo,
    audit,
    logger,
    eventBus,
  );
  const health = new HealthService(
    redis,
    firebase,
    logger,
    eventBus,
  );

  // Additional repositories
  const workspaceRepo = new WorkspaceRepository(firebase.firestore);
  const conversationRepo = new ConversationRepository(firebase.firestore);
  const modelRepo = new ModelRepository(firebase.firestore);

  // New services
  const workspaces = new WorkspaceService(workspaceRepo, audit, logger, eventBus);
  const teams = new TeamService(firebase.firestore, audit, logger, eventBus);
  const conversations = new ConversationService(conversationRepo, logger, eventBus);
  const prompts = new PromptService(firebase.firestore, audit, logger, eventBus);
  const notifications = new NotificationService(firebase.firestore, redis.cache, logger, eventBus);
  const extensions = new ExtensionService(firebase.firestore, audit, logger, eventBus);
  const models = new ModelRegistryService(modelRepo, logger, eventBus);
  const webhooks = new WebhookService(firebase.firestore, audit, logger, eventBus);
  const payments = new PaymentService(firebase.firestore, logger, eventBus);

  // Provider platform — configure from environment
  const providerPlatform = createProviderPlatform({
    providers: {
      ...(process.env['OPENAI_API_KEY'] ? { openai: { apiKey: process.env['OPENAI_API_KEY'] } } : {}),
      ...(process.env['ANTHROPIC_API_KEY'] ? { anthropic: { apiKey: process.env['ANTHROPIC_API_KEY'] } } : {}),
      ...(process.env['GEMINI_API_KEY'] ? { gemini: { apiKey: process.env['GEMINI_API_KEY'] } } : {}),
      ...(process.env['OPENROUTER_API_KEY'] ? { openrouter: { apiKey: process.env['OPENROUTER_API_KEY'] } } : {}),
      ...(process.env['OLLAMA_BASE_URL'] || process.env['NODE_ENV'] === 'development'
        ? { ollama: { baseUrl: process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434' } }
        : {}),
      ...(process.env['GROQ_API_KEY'] ? { groq: { apiKey: process.env['GROQ_API_KEY'] } } : {}),
    },
    defaultProvider: (process.env['DEFAULT_PROVIDER'] as any) ?? 'openai',
    fallbackOrder: ['openai', 'anthropic', 'groq', 'gemini', 'openrouter', 'ollama'],
    loadBalancing: 'least-latency',
  });

  return {
    eventBus,
    auth,
    users,
    organizations,
    apiKeys,
    audit,
    analytics,
    billing,
    secrets,
    health,
    rbac,
    workspaces,
    teams,
    conversations,
    prompts,
    notifications,
    extensions,
    models,
    webhooks,
    payments,
    providers: providerPlatform,
  };
}
