# Complete Audit

## Scope

Applications and systems reviewed:

- Backend
- Dashboard
- Desktop
- CLI
- Mobile
- VS Code extension
- Extension system
- Marketplace
- Orchestration engine
- Provider system
- Telemetry platform

## Application-by-Application Status

| Application | Startup | DI/config | Routing/API integration | Auth | Tests | Production readiness |
|---|---|---|---|---|---|---|
| Backend | Blocked by TypeScript syntax error | Partial; many engines not in ServiceProvider | Incomplete; 14 route modules unmounted | Middleware registered after public routes; client auth mismatch | Failing/OOM | Not ready |
| Dashboard | Build blocked by Google Fonts network fetch | Query provider/theme present | Calls unmounted endpoints | Firebase bearer token path present | Typecheck fails; missing testing lib | Not ready |
| Desktop | Typecheck passes | Electron preload bridge present | Calls unmounted workspace/tools endpoints | API key/auth status split | Limited tests; Monaco/xterm not covered | Prototype-plus, not production-ready |
| CLI | Typecheck fails | Config store present | Calls unmounted endpoints | API-key only | Typecheck fails; tests unavailable | Not ready |
| Mobile | Install/typecheck fails | Expo Router/TanStack Query present | Calls unmounted endpoints | SecureStore bearer token | Typecheck fails | Not ready |
| VS Code extension | Typecheck fails | Activation/services present | Calls unmounted endpoints | API-key auth and login token handling inconsistent | Typecheck fails | Not ready |

## Backend Audit

### Routes

Mounted route prefixes in `src/api/index.ts`:

```text
api.route('/auth', createAuthRouter(services.auth, services.audit, logger));
api.route('/health', createHealthRouter(services.health));
api.route('/providers', createProviderRouter(services.providers.router, services.providers.registry, logger));
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
```

Unmounted route modules:

```text
- billing-analytics.routes.ts
- cluster.routes.ts
- conversation-engine.routes.ts
- distributed.routes.ts
- enterprise.routes.ts
- extensions.routes.ts
- intelligence.routes.ts
- knowledge.routes.ts
- marketplace.routes.ts
- orchestrator.routes.ts
- runtime.routes.ts
- simulation.routes.ts
- tools.routes.ts
- workspace.routes.ts
```

### Services and dependency injection

`src/providers/service.provider.ts` constructs core CRUD/domain services, but does not construct or expose the dependency graph required by unmounted routers such as tools, workspace engine, orchestrator, marketplace, runtime, knowledge, cluster, distributed, intelligence, and simulation.

### Middleware

Global middleware is registered in `src/app.ts` in the expected order for request id, error handler, security headers, CORS, request logger and API rate limit. However, route-level authorization cannot be fully verified because many feature routers are not mounted and therefore never hit middleware.

### Shutdown

Backend has SIGTERM/SIGINT handling and disconnects Redis. Queue workers, schedulers, distributed buses and provider long-lived resources are not visibly stopped by `app.stop()`.

## Dashboard Audit

- Uses `NEXT_PUBLIC_API_URL` and Firebase token retrieval.
- React Query hooks exist for most domain areas.
- Typecheck fails in `src/hooks/use-api.ts` due key typing issues.
- Several pages have data hooks, but calls include unmounted endpoints.
- Production build failed due remote Google Font fetch.

## Desktop Audit

- Monaco/xterm integrations are present and desktop typecheck passes.
- Electron preload exposes workspace/chat/provider/model/tool/terminal/settings/auth/system/updater APIs.
- IPC maps many renderer calls to backend endpoints that are not mounted.
- Terminal PTY backend exists and is wired through IPC.
- Diff viewer and agent status panels remain absent or not integrated.

## CLI Audit

- Commands exist for login, chat, models, providers, tools, workspaces, memory, billing, etc.
- Typecheck fails because `@inquirer/prompts` is undeclared, nullable IDs are not narrowed, and `getToolStats` is referenced but not implemented.
- Extensions command explicitly says marketplace is coming soon.

## Mobile Audit

- Expo Router, SecureStore, TanStack Query, notifications service, MMKV dependency and safe area packages are present.
- `npm install` fails under normal resolution because React 19 conflicts with React Native 0.76 peer requirements.
- Typecheck then fails due missing `expo-status-bar`.
- Push notifications contain production placeholder comments.

## Agent/Provider/Tool/Event Audit

- Provider platform supports OpenAI, Anthropic, Gemini, OpenRouter, Ollama and Groq configuration paths.
- Dynamic model registry and tool registry route modules exist but are not mounted.
- Orchestrator route modules exist but are not mounted.
- Event bus exists but the application uses local in-memory EventBus by default; distributed event bus modules are not visibly connected to app startup.
- Queue worker entrypoint contains production comments and is not part of backend startup.

## Issue Register

| Issue ID | Severity | Location | Cause | Affected components | Risk level | Required fix | Dependencies | Effort | Suggested implementation |
|---|---|---|---|---|---|---|---|---|---|
| CODER-AUDIT-001 | Critical | src/workspace/indexing/indexer.ts:17 | TypeScript syntax error: Promise<readonly IndexEntry>> has an extra closing >. | Backend build, workspace indexing, search, desktop/CLI/mobile/vscode workspace features | Platform cannot compile; deployments blocked. | Fix signature to Promise<readonly IndexEntry[]> or readonly array syntax, add focused indexer compile test. | None; blocks all backend build/test pipelines. | XS | Patch type, run root typecheck/build. |
| CODER-AUDIT-002 | Critical | src/api/index.ts; src/api/routes/*.ts | Fourteen implemented route modules are not mounted in the API composition root. | Tools, workspace engine, orchestrator, extensions, marketplace, knowledge, runtime, simulation, billing analytics, cluster/distributed APIs | Existing clients call endpoints that resolve to 404; services appear complete but are unreachable. | Mount routers and construct their dependencies in ServiceProvider/composition root, or remove client calls until supported. | ToolRegistry, DynamicModelRegistry, FileService, WorkspaceIndexer, SnapshotService, orchestrator services. | L | Add dependency providers and route registrations with auth policy tests. |
| CODER-AUDIT-003 | Critical | dashboard/src/lib/api.ts; desktop/electron/ipc/handlers.ts; apps/mobile/services/api.ts; packages/*/services/api* | Client API paths use /tools, /workspace, /billing-analytics, /orchestrator, /extensions while backend mounts only /models, /billing, /workspaces, etc. | Dashboard, desktop, CLI, mobile, VS Code extension | Large portions of UI/CLI/extension fail despite present screens and methods. | Generate an OpenAPI contract from mounted routes and make all clients consume one shared typed SDK. | Route mounting fix from CODER-AUDIT-002. | XL | Introduce contract tests comparing client endpoint inventory to server router inventory. |
| CODER-AUDIT-004 | High | src/api/routes/conversations.routes.ts | Mounted conversation router lacks /:id/send and /:id/send/stream, while every client calls them. | Chat streaming, dashboard chat, desktop chat, CLI chat, mobile chat, VS Code chat | Core chat UX fails or falls back to non-existent endpoints. | Mount conversation-engine router or add send/stream handlers to mounted conversation router. | Provider router, conversation engine orchestrator. | M | Route streaming through existing conversation engine; add SSE contract tests. |
| CODER-AUDIT-005 | High | src/providers/service.provider.ts | ServiceProvider wires CRUD services only; workspace engine, tool registry, dynamic model registry, orchestrator and marketplace runtime dependencies are absent. | Backend dependency injection, tools, workspace files, marketplace, agents | Implemented services cannot be called safely because required instances are never created. | Extend composition root with all existing engines and pass to mounted routers without duplicating business logic. | Existing workspace/tools/orchestrator modules. | L | Add provider factories and health checks for each subsystem. |
| CODER-AUDIT-006 | High | root npm test | Backend test suite has failing tests and eventually OOMs under normal vitest run. | Backend CI, runtime memory/checkpoint/approval modules | No reliable regression signal; memory leak or test isolation issue possible. | Fix failing assertions, isolate heavy tests, configure Vitest memory limits/workers. | MemoryManager, RuntimeManager, DistributedCheckpointManager, ApprovalManager. | M | Run failing files individually; add heap profiling for long suite. |
| CODER-AUDIT-007 | High | dashboard/src/hooks/use-api.ts; dashboard/src/tests/unit/components.test.tsx | Dashboard typecheck fails due query key type mismatch and missing @testing-library/react dependency. | Dashboard build/test reliability | Dashboard cannot be treated as production-ready; test files cannot compile. | Fix hook generic types/query keys; add missing testing dependency. | Dashboard package manifest. | S | Run npx tsc and vitest in dashboard CI. |
| CODER-AUDIT-008 | High | packages/cli/src/commands/*.ts; packages/cli/package.json | CLI imports @inquirer/prompts but package is undeclared; API method getToolStats missing; nullable conversationId passed to string APIs. | CLI login/chat/tools | CLI does not typecheck and interactive commands may crash. | Declare dependency, align API surface, narrow nullable IDs before calls. | CLI package manifest and api service. | S | Add CLI typecheck to CI. |
| CODER-AUDIT-009 | High | packages/vscode/src/**/*.ts | VS Code extension typecheck fails in command and provider code. | VS Code extension activation, editor commands, completions, utility commands | Extension package cannot be built reliably; marketplace publication blocked. | Fix async openTextDocument handling, QuickPick item typing, InlineCompletionTriggerKind enum usage. | VS Code API version. | M | Add extension typecheck/build tests. |
| CODER-AUDIT-010 | High | apps/mobile/package.json; apps/mobile/app/_layout.tsx | Mobile dependency graph conflicts React 19 with React Native 0.76 peer React 18 and misses expo-status-bar. | Mobile startup, Expo Router | Install/typecheck fail without legacy peer deps; runtime compatibility risk. | Align Expo/RN/React versions and add missing package. | Expo SDK 52 compatibility matrix. | M | Run expo doctor and typecheck in CI. |
| CODER-AUDIT-011 | Medium | dashboard/src/app/layout.tsx | Dashboard production build fetches Google Font at build time; sandbox build failed due network. | Dashboard deployment | Offline/air-gapped deployments fail. | Use local font asset or pre-bundled font; set outputFileTracingRoot. | Next.js font config. | S | Replace next/font/google with next/font/local. |
| CODER-AUDIT-012 | High | npm audit across root/dashboard/desktop/cli/vscode/mobile | Dependency audits report critical/high vulnerabilities in every package area. | Supply chain, desktop packaging, mobile, backend | Known vulnerable transitive dependencies ship to users. | Triage npm audit findings, upgrade or replace vulnerable packages, document exceptions. | Package managers and lock files. | M | Create security dependency dashboard and weekly audit job. |
| CODER-AUDIT-013 | Medium | desktop/renderer/src/explorer/FileManager.ts | Explorer rename/copy/move/delete call tool IDs such as workspace.rename but no mounted /tools router or verified tool definitions. | Desktop explorer file operations | Explorer operations are UI-connected but backend-unverified. | Reuse existing workspace file API or register/mount file tools with contract tests. | Tool registry route mounting. | M | Add file operation integration tests through preload IPC. |
| CODER-AUDIT-014 | Medium | desktop/renderer/src/editor/CompletionManager.ts | Monaco completion provider inserts TODO snippet and is not connected to provider/orchestrator completion APIs. | Desktop editor inline completions | Editor appears AI-capable but suggestions are local placeholder snippets. | Route completions through existing provider/orchestrator endpoint when available; remove TODO placeholder. | Provider/orchestrator streaming route. | M | Add cancellation/debounce and telemetry around completions. |
| CODER-AUDIT-015 | Medium | desktop/electron/ipc/handlers.ts; desktop/renderer/components/chat/chat-panel.tsx | Desktop chat hardcodes conversation id current and does not create/select conversations from backend. | Desktop chat/conversations | Messages may be sent to a non-existent conversation. | Reuse conversation create/list APIs and activeConversationId store before stream. | Conversation route fix. | S | Add chat panel integration test. |
| CODER-AUDIT-016 | High | desktop/electron/services/api-bridge.ts; packages/cli/src/services/api.ts; packages/vscode/src/services/api-client.ts | Authentication schemes differ: dashboard/mobile use Bearer Firebase token; desktop/CLI/VS Code use X-API-Key; backend auth middleware likely expects verified auth context. | Cross-app authentication/authorization | Clients may be unauthorized even with configured credentials. | Document supported auth modes and update middleware/clients consistently. | Auth middleware, API key service/RBAC. | M | Add auth matrix tests for all client types. |
| CODER-AUDIT-017 | Medium | src/queues/worker.ts; src/cluster/queues; src/app.ts | Queue/worker modules exist but app startup only connects Redis and HTTP server; schedulers/workers are not initialized. | Queues, schedulers, background jobs, recovery | Asynchronous workflows and retries may never run. | Create explicit worker process entrypoints and deployment manifests; register queues with health checks. | BullMQ/Redis. | M | Add worker smoke test and process supervision docs. |
| CODER-AUDIT-018 | Medium | src/core/event-bus.ts; services using eventBus | Event bus is in-memory; distributed-event modules exist but are not wired into app composition. | Events, telemetry, audit, distributed workflows | Events do not cross process boundaries; subscribers in unstarted workers miss events. | Bridge local EventBus to distributed bus/queue when cluster mode is enabled. | Redis/BullMQ cluster modules. | L | Add publisher/subscriber inventory tests. |
| CODER-AUDIT-019 | Medium | desktop/electron/security/policies.ts; electron main/preload | Electron security policy exists but audit did not find enforced CSP/window navigation/openExternal allowlist validation in IPC layer. | Desktop security | Potential unsafe external URL opening and renderer trust boundary gaps. | Apply security policies in BrowserWindow config and validate openExternal URLs. | Electron shell/preload. | S | Add IPC security tests. |
| CODER-AUDIT-020 | Medium | src/modules/billing/billing.service.ts; dashboard/mobile billing APIs | Billing service contains production placeholders and clients call billing-analytics routes that are unmounted. | Billing, quotas, invoices, subscriptions | Billing appears present but is not production integrated with payment provider. | Wire PaymentService and billing analytics routes or hide billing UI until live. | Payments module, Stripe/Paddle config. | L | Add billing provider sandbox integration tests. |
| CODER-AUDIT-021 | Medium | apps/mobile/notifications/service.ts | Push notification permission/token registration contains In production comments and no backend registration verification. | Mobile notifications | Notifications UI/hooks may not deliver push messages. | Implement Expo notification token registration endpoint and client flow. | Notifications service/routes. | M | Add device-token API tests. |
| CODER-AUDIT-022 | Medium | results from static scan | Several browser/MCP/security modules contain production placeholder comments for Playwright/MCP/GeoIP/seed data. | Tools, browser automation, MCP, zero-trust | Feature completeness is overstated in production contexts. | Replace placeholders with real adapters or feature-flag unavailable capabilities. | External MCP/browser/GeoIP services. | M | Add unavailable-state tests. |
| CODER-AUDIT-023 | Medium | desktop package/dependencies | Desktop build passes typecheck/vite but electron-builder was not validated after native modules were installed with --ignore-scripts earlier; native better-sqlite3/node-pty packaging risk remains. | Desktop release pipeline | Packaged app may fail on native module load. | Run full electron-builder in CI with native rebuild and platform matrix. | Node headers, electron-rebuild. | M | Add release smoke launch tests. |
| CODER-AUDIT-024 | Medium | all apps | No monorepo-level workspace package manager configuration; package-lock files exist at root and desktop, sub-app installs are independent. | Dependency management, CI reproducibility | Version skew and duplicate React/TypeScript dependencies across apps. | Adopt npm workspaces/pnpm workspace and lockfile policy. | All package manifests. | L | Create workspace root package manager config. |
| CODER-AUDIT-025 | Low | src/tests/setup.ts | Heavy mocks cover Firebase/Redis globally; integration tests do not verify real provider connectivity. | Testing, infrastructure confidence | Green unit tests can hide broken environment/config/dependency injection. | Add opt-in integration suite with local Redis/Firebase emulator and contract tests. | Docker compose, test env vars. | M | Mark integration tests separately and run nightly. |

