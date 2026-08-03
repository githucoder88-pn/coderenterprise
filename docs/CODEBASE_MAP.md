# Codebase Map

Generated mental model of the repository, folder by folder.

```
coderenterprise/
├─ package.json              Root (backend) package — scripts, pnpm, deps
├─ tsconfig.json             Backend TS config + path aliases (@core/* …)
├─ Dockerfile                Multi-stage production image (node:24-alpine, non-root)
├─ docker-compose.yml        App + Redis local stack
├─ .env.example              All environment variables with comments
├─ vitest.config.ts          Root Vitest config (backend)
│
├─ src/                      BACKEND
│  ├─ index.ts               Process entry; loads config, starts server, shutdown hooks
│  ├─ app.ts                 createApp(config) — wires middleware, routes, providers
│  ├─ config/                Zod-validated config (env parsing)
│  ├─ core/                  Framework primitives (DI, EventBus, Result, Errors, base classes)
│  ├─ types/                 Shared TypeScript types (events, pagination, errors, IDs)
│  ├─ middleware/            Hono middleware (auth, cors, rate-limit, logging, security, error handler)
│  ├─ api/
│  │  ├─ index.ts            Central router mounting all domain routes under /api/v1
│  │  └─ routes/*.routes.ts  One router per domain (auth, users, …, knowledge, intelligence, etc.)
│  ├─ modules/               Domain modules (DDD-style)
│  │  ├─ auth/               Sign-in/up, JWT issuance, session management
│  │  ├─ users/              User CRUD
│  │  ├─ organizations/      Orgs & membership
│  │  ├─ teams/              Team management within orgs
│  │  ├─ rbac/               Role-based access control
│  │  ├─ apikeys/            API key CRUD + scoping
│  │  ├─ secrets/            Encrypted secret storage
│  │  ├─ audit/              Audit log append-only store
│  │  ├─ billing/            Billing service (plans, subscriptions)
│  │  ├─ analytics/          Usage, invoices, quota
│  │  ├─ conversations/      Conversation persistence (used with engine/)
│  │  ├─ notifications/      In-app + push notifications
│  │  ├─ prompts/            Prompt library
│  │  ├─ models/             Model registry & sync
│  │  ├─ providers/          Provider framework + resilience
│  │  │  ├─ implementations/ OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama
│  │  │  └─ resilience/      Circuit breaker, load balancer, request queue
│  │  ├─ extensions/         Extension management (non-sandbox)
│  │  ├─ health/             Liveness/readiness
│  │  ├─ payments/           Payment processor abstraction
│  │  ├─ webhooks/           Outbound webhook delivery
│  │  └─ workspaces/         Workspace metadata (for index/search see workspace/)
│  ├─ conversations/         Conversation engine
│  │  ├─ streaming-engine.ts SSE streaming
│  │  ├─ context-engine.ts   Context window management
│  │  ├─ memory-service.ts   Short/long term memory
│  │  ├─ orchestrator.ts     Bridge to src/orchestrator
│  │  ├─ session-manager.ts  Per-conversation sessions
│  │  ├─ attachment-service.ts File/image uploads
│  │  └─ prompt-templates.ts System / user prompt templates
│  ├─ orchestrator/          Multi-agent orchestration
│  │  ├─ planner/            Task decomposition (task-planner.ts)
│  │  ├─ execution/          Execution engine (DAG runner)
│  │  ├─ checkpoints/        Checkpoint persistence/restore
│  │  └─ registry/           Agent type registry
│  ├─ intelligence/          Higher-order reasoning layers
│  │  ├─ planning-engine, reasoning-engine, reflection-engine,
│  │  ├─ evaluation-engine, optimization-engine, coordination-engine
│  ├─ knowledge/             Retrieval-augmented knowledge
│  │  ├─ indexing, memory, retrieval, summarization
│  ├─ workspace/             Repo-aware workspace system
│  │  ├─ files, indexing, embeddings, patches, snapshots, backups, diff, editors, search/*
│  ├─ tools/                 Built-in tool implementations
│  │  ├─ shell, filesystem, git, browser, docker, search, mcp
│  │  └─ registry/           tool-registry.ts, model-sync.ts
│  ├─ extensions/            Runtime extension framework
│  │  ├─ lifecycle, registry, sandbox, messaging, permissions,
│  │  ├─ dependencies, storage, marketplace
│  ├─ marketplace/           Extension marketplace
│  │  ├─ registry, publishers, installers, ratings, moderation
│  ├─ enterprise/            Enterprise-only features
│  │  ├─ organizations (hierarchy), policies, compliance, security-manager, deployments
│  ├─ cluster/               Distributed clustering (horizontal scale-out)
│  │  ├─ coordinator/, events/, workers/, monitoring/, queues/, registry/, scheduler/, scaling/
│  ├─ runtime/               Runtime approvals, memory, policies, manager
│  ├─ simulation/            Bench/experiment harness
│  │  ├─ environments, scenarios, experiments, replay, scoring, benchmarks
│  ├─ queues/                BullMQ worker entry
│  ├─ telemetry/             Logging, metrics, observability, OTel integrations
│  ├─ services/security/     Security utilities (csrf, xss, encryption, rate-limiter, …)
│  ├─ infrastructure/        Adapters to external services
│  │  ├─ firebase/           auth-client, firestore-client, storage-client
│  │  └─ redis/              redis-client, cache
│  ├─ providers/             Composition root (service.provider.ts wires everything)
│  ├─ database/              schema.ts (logical Firestore schema) + seeds
│  └─ tests/                 Unit tests per subsystem
│
├─ dashboard/                WEB DASHBOARD (Next.js 15 App Router, React 19)
│  └─ src/
│     ├─ app/                Next App Router pages (dashboard/*)
│     ├─ components/         UI (ui/* primitives, layout/* shell, command-palette)
│     ├─ hooks/              TanStack Query hooks
│     ├─ lib/                api client, utils
│     ├─ providers/          Query, theme
│     ├─ stores/             Zustand auth/ui stores
│     ├─ styles/             Tailwind
│     └─ tests/              Vitest + RTL
│
├─ desktop/                  DESKTOP APP (Electron + Vite + React 19)
│  ├─ electron/              Main-process code
│  │  ├─ main/, preload/, ipc/, security/, services/
│  ├─ renderer/              React UI (chat, editor, terminal, layout, views)
│  └─ tests/                 Vitest
│
├─ packages/
│  ├─ cli/                   TERMINAL CLI (Commander + Ink)
│  │  └─ src/
│  │     ├─ commands/        login, chat, providers, models, agents, workspace, …
│  │     ├─ services/api.ts  API client
│  │     ├─ config/          conf-based settings
│  │     ├─ storage/         SQLite-backed conversation store
│  │     ├─ ui/              Ink components (markdown, table, format)
│  │     └─ tests/
│  └─ vscode/                VS CODE EXTENSION
│     └─ src/
│        ├─ extension.ts     Activation entry
│        ├─ authentication/  Auth service
│        ├─ commands/        Editor / chat / utility / workspace commands
│        ├─ providers/       Hover, code-actions, inline-completions
│        ├─ services/        api-client, chat-service, log-service
│        ├─ ui/              Trees (conversations, providers, models, tools)
│        ├─ workspace/       Workspace indexing / search
│        └─ tests/
│
├─ apps/mobile/              REACT NATIVE MOBILE (Expo 52 / RN 0.76)
│  ├─ app/                   Expo Router file-based navigation
│  ├─ components/
│  │  ├─ common/             Buttons, cards, icons, safe-area, offline banner, tab icon
│  │  ├─ chat/               MessageRenderer, MarkdownRenderer, Composer, MessageToolbar
│  │  ├─ code/               CodeBlock, CodeViewer, CodeToolbar, syntax.ts, CopyButton, LanguageBadge
│  │  ├─ voice/              WaveformView, VoiceRecorder, VoiceButton, Recorder, Transcriber
│  │  ├─ attachments/        Image/camera/document/clipboard pickers
│  │  ├─ sheet/              BottomSheet (Reanimated + Gesture Handler)
│  │  └─ skeleton/           Shimmer + skeleton primitives
│  ├─ theme/                 Design tokens, ThemeProvider
│  ├─ hooks/                 TanStack Query hooks, biometrics, cached queries
│  ├─ lib/commands.ts        Slash command registry
│  ├─ offline/               MMKV-backed cache, queue, drafts, sync manager
│  ├─ providers/             AppProvider, QueryProvider
│  ├─ services/api.ts        Fetch-based API/SSE client
│  ├─ stores/                Zustand (auth-store, app-store)
│  ├─ security/              SecureStorage (expo-secure-store)
│  ├─ notifications/         NotificationService (expo-notifications wrapper)
│  ├─ utils/                 Haptics wrapper, responsive breakpoints
│  └─ tests/
│
└─ docs/                     You are here.
```
