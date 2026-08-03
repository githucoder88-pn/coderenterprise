/**
 * API Router
 *
 * Central route registry that mounts all domain routers.
 */

import { Hono } from 'hono';
import type { ServiceProvider } from '../providers/service.provider.js';
import type { IAuthClient } from '../infrastructure/firebase/auth-client.js';
import type { ILogger } from '../telemetry/logger.js';
import type { IMetrics } from '../telemetry/metrics.js';
import type { AppConfig } from '../config/index.js';
import type { RedisProvider } from '../providers/redis.provider.js';
import type { FirebaseProvider } from '../providers/firebase.provider.js';

import { authMiddleware } from '../middleware/auth.js';

// Core routes
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

// Enterprise routes
import { createBillingAnalyticsRouter } from './routes/billing-analytics.routes.js';
import { createClusterRouter } from './routes/cluster.routes.js';
import { createConversationEngineRouter } from './routes/conversation-engine.routes.js';
import { createDistributedRouter } from './routes/distributed.routes.js';
import { createEnterpriseRouter } from './routes/enterprise.routes.js';
import { createExtensionRouter } from './routes/extensions.routes.js';
import { createIntelligenceRouter } from './routes/intelligence.routes.js';
import { createKnowledgeRouter } from './routes/knowledge.routes.js';
import { createMarketplaceRouter } from './routes/marketplace.routes.js';
import { createOrchestratorRouter } from './routes/orchestrator.routes.js';
import { createRuntimeRouter } from './routes/runtime.routes.js';
import { createSimulationRouter } from './routes/simulation.routes.js';
import { createToolRouter } from './routes/tools.routes.js';
import { createWorkspaceEngineRouter } from './routes/workspace.routes.js';

// Analytics services
import { UsageTracker } from '../analytics/usage-tracker.js';
import { QuotaService } from '../analytics/quota-service.js';
import { SubscriptionService } from '../analytics/subscription-service.js';
import { InvoiceService } from '../analytics/invoice-service.js';
import { ObservabilityService } from '../telemetry/observability.js';

// Cluster services
import { QueueManager } from '../cluster/queues/queue-manager.js';
import { WorkerManager } from '../cluster/workers/worker-manager.js';
import { JobScheduler } from '../cluster/scheduler/job-scheduler.js';
import { AutoScaler } from '../cluster/scaling/auto-scaler.js';
import { ClusterMonitor } from '../cluster/monitoring/cluster-monitor.js';
import { ServiceRegistry } from '../cluster/registry/service-registry.js';
import { DistributedEventBus } from '../cluster/events/distributed-event-bus.js';
import { ClusterManager } from '../cluster/coordinator/cluster-manager.js';
import { AgentScheduler } from '../cluster/coordinator/agent-scheduler.js';
import { NodeManager } from '../cluster/coordinator/node-manager.js';
import { DistributedCheckpointManager } from '../cluster/coordinator/distributed-checkpoints.js';
import { DistributedMemoryStore } from '../cluster/coordinator/distributed-memory.js';
import { HealthMonitor } from '../cluster/coordinator/health-monitor.js';

// Conversation engine
import { ConversationService as EngineConversationService } from '../conversations/engine/conversation-service.js';
import { ContextEngine } from '../conversations/engine/context-engine.js';
import { SessionManager } from '../conversations/engine/session-manager.js';
import { PromptTemplateService } from '../conversations/engine/prompt-templates.js';
import { Orchestrator as ConversationOrchestrator } from '../conversations/engine/orchestrator.js';

// Enterprise
import { OrganizationHierarchy } from '../enterprise/organizations/organization-hierarchy.js';
import { PolicyEngine } from '../enterprise/policies/policy-engine.js';
import { ComplianceEngine } from '../enterprise/compliance/compliance-engine.js';
import { SecurityManager } from '../enterprise/security/security-manager.js';
import { DeploymentManager } from '../enterprise/deployments/deployment-manager.js';

// Extensions
import { ExtensionRegistry } from '../extensions/registry/extension-registry.js';
import { ExtensionLifecycleManager } from '../extensions/lifecycle/extension-lifecycle.js';
import { PermissionManager } from '../extensions/permissions/permission-manager.js';
import { DependencyResolver } from '../extensions/dependencies/dependency-resolver.js';
import { ExtensionMarketplace } from '../extensions/marketplace/extension-marketplace.js';
import { MessageBus } from '../extensions/messaging/message-bus.js';

// Intelligence
import { ReasoningEngine } from '../intelligence/reasoning/reasoning-engine.js';
import { PlanningEngine } from '../intelligence/planning/planning-engine.js';
import { EvaluationEngine } from '../intelligence/evaluation/evaluation-engine.js';
import { ReflectionEngine } from '../intelligence/reflection/reflection-engine.js';
import { OptimizationEngine } from '../intelligence/optimization/optimization-engine.js';

// Knowledge
import { MemoryManager } from '../knowledge/memory/memory-manager.js';
import { RetrievalEngine } from '../knowledge/retrieval/retrieval-engine.js';
import { IndexManager } from '../knowledge/indexing/index-manager.js';
import { Summarizer } from '../knowledge/summarization/summarizer.js';

// Marketplace
import { PackageRegistry } from '../marketplace/registry/package-registry.js';
import { PublisherService } from '../marketplace/publishers/publisher-service.js';
import { RatingService } from '../marketplace/ratings/rating-service.js';
import { InstallerService } from '../marketplace/installers/installer-service.js';
import { ModerationService } from '../marketplace/moderation/moderation-service.js';

// Orchestrator
import { AgentRegistry } from '../orchestrator/registry/agent-registry.js';
import { ExecutionEngine } from '../orchestrator/execution/execution-engine.js';
import { CheckpointManager } from '../orchestrator/checkpoints/checkpoint-manager.js';
import { TaskPlanner } from '../orchestrator/planner/task-planner.js';

// Runtime
import { RuntimeManager } from '../runtime/orchestrator/runtime-manager.js';
import { ApprovalManager } from '../runtime/approvals/approval-manager.js';
import { RuntimeMemoryStore } from '../runtime/memory/runtime-memory.js';
import { PolicyManager } from '../runtime/policies/runtime-policies.js';

// Simulation
import { SimulationManager } from '../simulation/environments/simulation-manager.js';
import { ScenarioManager } from '../simulation/scenarios/scenario-manager.js';
import { BenchmarkManager } from '../simulation/benchmarks/benchmark-manager.js';
import { ExperimentManager } from '../simulation/experiments/experiment-manager.js';
import { ReplayManager } from '../simulation/replay/replay-manager.js';

// Tools
import { ToolRegistry } from '../tools/registry/tool-registry.js';
import { DynamicModelRegistry } from '../tools/registry/model-sync.js';

// Workspace engine
import { FileService } from '../workspace/files/file-service.js';
import { WorkspaceIndexer } from '../workspace/indexing/indexer.js';
import { SnapshotService } from '../workspace/snapshots/snapshot-service.js';
import { DiffEngine } from '../workspace/diff/diff-engine.js';
import { AstParser } from '../workspace/editors/ast-parser.js';
import { HybridSearchEngine } from '../workspace/search/hybrid-search.js';

export function createApiRouter(
  services: ServiceProvider,
  authClient: IAuthClient,
  redis: RedisProvider,
  logger: ILogger,
  metrics: IMetrics,
  _config: AppConfig,
  firebase: FirebaseProvider,
): Hono {
  const api = new Hono();

  // ─── Public routes (no auth required) ──────────────────────────────────
  api.route('/auth', createAuthRouter(services.auth, services.audit, logger));
  api.route('/health', createHealthRouter(services.health));
  api.route('/providers', createProviderRouter(services.providers.router, services.providers.registry, logger));

  // ─── Protected routes ──────────────────────────────────────────────────
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

  // ─── Billing Analytics ─────────────────────────────────────────────────
  const usageTracker = new UsageTracker(redis.cache, logger);
  const quotaService = new QuotaService(logger);
  const subscriptionService = new SubscriptionService(quotaService, logger);
  const invoiceService = new InvoiceService(usageTracker, logger);
  const observability = new ObservabilityService(metrics);
  api.route('/billing-analytics', createBillingAnalyticsRouter(usageTracker, quotaService, subscriptionService, invoiceService, observability, logger));

  // ─── Cluster ───────────────────────────────────────────────────────────
  const queueManager = new QueueManager(logger);
  const workerManager = new WorkerManager('localhost', logger);
  const jobScheduler = new JobScheduler(queueManager, logger);
  const autoScaler = new AutoScaler(logger);
  const clusterMonitor = new ClusterMonitor(logger, metrics);
  const serviceRegistryVal = new ServiceRegistry(logger);
  const distributedEventBus = new DistributedEventBus(logger);
  api.route('/cluster', createClusterRouter(queueManager, workerManager, jobScheduler, autoScaler, clusterMonitor, serviceRegistryVal, distributedEventBus, logger));

  // ─── Conversation Engine ───────────────────────────────────────────────
  const contextEngine = new ContextEngine({ build: async () => ({ maxTokens: 0, usedTokens: 0, remainingTokens: 0, messages: [], systemPrompt: '', workspaceContext: null, memoryContext: null, compactionApplied: false, truncationApplied: false }) } as any);
  const sessionManager = new SessionManager(redis.cache, logger);
  const engineConversationService = new EngineConversationService(contextEngine, sessionManager, logger, services.eventBus);
  const promptTemplateService = new PromptTemplateService();
  const conversationOrchestrator = new ConversationOrchestrator(
    engineConversationService, contextEngine,
    null as any, null as any,
    sessionManager, logger,
  );
  api.route('/conversation-engine', createConversationEngineRouter(engineConversationService, conversationOrchestrator, contextEngine as any, sessionManager, promptTemplateService, logger));

  // ─── Distributed ───────────────────────────────────────────────────────
  const clusterManager = new ClusterManager(logger);
  const nodeManager = new NodeManager(logger);
  const agentScheduler = new AgentScheduler(clusterManager, nodeManager, logger);
  const distributedCheckpointManager = new DistributedCheckpointManager(logger);
  const distributedMemoryStore = new DistributedMemoryStore(logger);
  const healthMonitor = new HealthMonitor(clusterManager, agentScheduler);
  api.route('/distributed', createDistributedRouter(clusterManager, agentScheduler, distributedCheckpointManager, distributedMemoryStore, healthMonitor, logger));

  // ─── Enterprise ────────────────────────────────────────────────────────
  const orgHierarchy = new OrganizationHierarchy(logger);
  const policyEngine = new PolicyEngine(logger);
  const complianceEngine = new ComplianceEngine(logger);
  const securityManager = new SecurityManager(logger);
  const deploymentManager = new DeploymentManager(logger);
  api.route('/enterprise', createEnterpriseRouter(orgHierarchy, policyEngine, complianceEngine, securityManager, deploymentManager, logger));

  // ─── Extensions ────────────────────────────────────────────────────────
  const extensionRegistry = new ExtensionRegistry(logger);
  const extensionPermissions = new PermissionManager(logger);
  const dependencyResolver = new DependencyResolver(extensionRegistry);
  const extensionLifecycle = new ExtensionLifecycleManager(extensionRegistry, extensionPermissions, dependencyResolver, logger);
  const extensionMarketplace = new ExtensionMarketplace(logger);
  const messageBus = new MessageBus(logger);
  api.route('/extensions', createExtensionRouter(extensionRegistry, extensionLifecycle, extensionPermissions, messageBus, extensionMarketplace, logger));

  // ─── Intelligence ──────────────────────────────────────────────────────
  const reasoningEngine = new ReasoningEngine(logger);
  const planningEngine = new PlanningEngine(logger);
  const evaluationEngine = new EvaluationEngine(logger);
  const reflectionEngine = new ReflectionEngine(logger);
  const optimizationEngine = new OptimizationEngine(logger);
  api.route('/intelligence', createIntelligenceRouter(reasoningEngine, planningEngine, evaluationEngine, reflectionEngine, optimizationEngine, logger));

  // ─── Knowledge ─────────────────────────────────────────────────────────
  const knowledgeMemory = new MemoryManager(logger);
  const knowledgeRetrieval = new RetrievalEngine(logger);
  const knowledgeIndexer = new IndexManager(knowledgeRetrieval, logger);
  const knowledgeSummarizer = new Summarizer();
  api.route('/knowledge', createKnowledgeRouter(knowledgeMemory, knowledgeRetrieval, knowledgeIndexer, knowledgeSummarizer, logger));

  // ─── Marketplace ───────────────────────────────────────────────────────
  const packageRegistry = new PackageRegistry(logger);
  const publisherService = new PublisherService(logger);
  const ratingService = new RatingService(logger);
  const installerService = new InstallerService(packageRegistry, logger);
  const moderationService = new ModerationService(logger);
  api.route('/marketplace', createMarketplaceRouter(packageRegistry, publisherService, ratingService, installerService, moderationService, logger));

  // ─── Orchestrator ──────────────────────────────────────────────────────
  const agentRegistry = new AgentRegistry(logger);
  const executionEngine = new ExecutionEngine(agentRegistry, logger);
  const checkpointManager = new CheckpointManager(logger);
  const taskPlanner = new TaskPlanner(logger);
  api.route('/orchestrator', createOrchestratorRouter(agentRegistry, executionEngine, checkpointManager, taskPlanner, logger));

  // ─── Runtime ───────────────────────────────────────────────────────────
  const runtimeManager = new RuntimeManager(logger);
  const approvalManager = new ApprovalManager(logger);
  const runtimeMemory = new RuntimeMemoryStore(logger);
  const runtimePolicies = new PolicyManager(logger);
  api.route('/runtime', createRuntimeRouter(runtimeManager, approvalManager, runtimeMemory, runtimePolicies, logger));

  // ─── Simulation ────────────────────────────────────────────────────────
  const scenarioManager = new ScenarioManager(logger);
  const simulationManager = new SimulationManager(scenarioManager, logger);
  const benchmarkManager = new BenchmarkManager(scenarioManager, logger);
  const experimentManager = new ExperimentManager(logger);
  const replayManager = new ReplayManager(logger);
  api.route('/simulation', createSimulationRouter(simulationManager, scenarioManager, benchmarkManager, experimentManager, replayManager, logger));

  // ─── Tools ─────────────────────────────────────────────────────────────
  const toolRegistry = new ToolRegistry(logger);
  const dynamicModelRegistry = new DynamicModelRegistry(redis.cache, logger);
  api.route('/tools', createToolRouter(toolRegistry, dynamicModelRegistry, logger));

  // ─── Workspace Engine ──────────────────────────────────────────────────
  const fileService = new FileService(firebase.firestore, firebase.storage, logger);
  const diffEngine = new DiffEngine();
  const astParser = new AstParser();
  const searchEngine = new HybridSearchEngine();
  const workspaceIndexer = new WorkspaceIndexer(fileService, astParser, searchEngine, logger);
  const snapshotService = new SnapshotService(fileService, logger);
  api.route('/workspace-engine', createWorkspaceEngineRouter(fileService, workspaceIndexer, snapshotService, diffEngine, astParser, searchEngine, logger));

  // ─── Metrics endpoint ──────────────────────────────────────────────────
  api.get('/metrics', (c) => {
    return c.json(metrics.snapshot());
  });

  return api;
}
