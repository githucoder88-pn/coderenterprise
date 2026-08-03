# CODER Enterprise

**Production-grade, provider-independent AI development platform.**

CODER is a monorepo containing a backend API server, a web dashboard, a CLI,
a desktop app (Electron), a VS Code extension, and a React Native mobile app.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CODER PLATFORM                              │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   CLI        │ VS Code      │ Desktop      │ Mobile (React Native)  │
│   (Node)     │ Extension    │ (Electron)   │ Expo / iOS / Android   │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                          Web Dashboard (Next.js 15)                 │
├─────────────────────────────────────────────────────────────────────┤
│   REST API  ·  SSE Streaming  ·  WebSockets  ·  Webhooks            │
│                          Hono / Node 22                            │
├─────────────────────────────────────────────────────────────────────┤
│   Orchestrator  ·  Agent runtime  ·  Knowledge  ·  Tools            │
│   Extensions    ·  Marketplace    ·  RBAC     ·  Billing           │
├──────────────────────────────┬──────────────────────────────────────┤
│  Firebase (Auth, Firestore,  │  Redis (cache, queues, pub/sub)      │
│  Storage)                    │  BullMQ (background workers)         │
└──────────────────────────────┴──────────────────────────────────────┘
```

## Repository layout

| Path | Purpose | Package name |
|------|---------|--------------|
| `src/` | Backend server (Hono, Node 22) | `coderenterprise-backend` |
| `dashboard/` | Web console (Next.js 15, React 19) | `coder-dashboard` |
| `desktop/` | Electron desktop app | `coder-desktop` |
| `packages/cli/` | Terminal CLI (Ink, Commander) | `@coder/cli` |
| `packages/vscode/` | VS Code extension | `coder-vscode` |
| `apps/mobile/` | React Native / Expo mobile app | `@coder/mobile` |
| `docs/` | This documentation | — |
| `src/tests/`, `*/tests/` | Vitest unit tests | — |
| `Dockerfile`, `docker-compose.yml` | Container build / local dev stack | — |

## Quick start

```bash
# 1. Install (pnpm 9+ required, npm works too)
npm install

# 2. Copy env
cp .env.example .env
# Fill in Firebase, Redis, and AI-provider keys.

# 3. Run backend in dev mode
npm run dev

# 4. Run the dashboard (separate terminal)
cd dashboard && npm install && npm run dev

# 5. Run the CLI
cd packages/cli && npm install && npm run build && node dist/index.js --help

# 6. Run the mobile app
cd apps/mobile && npm install && npx expo start
```

```bash
# Tests
npm test                 # Backend
cd dashboard && npm test
cd desktop && npm test
cd packages/cli && npm test
cd packages/vscode && npm test
cd apps/mobile && npm test
```

```bash
# Docker
docker compose up --build
```

## Key technologies

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+, TypeScript 5.x |
| HTTP | Hono (fast, Express-like, web-standard) |
| Validation | Zod (config, requests, entities) |
| Database | Firebase Firestore (document) |
| Auth | Firebase Auth (email/password + OAuth) + JWT |
| Cache / Pub-sub | Redis (ioredis) |
| Queues | BullMQ (background jobs, agent runs) |
| Logging / Metrics | Pino + OpenTelemetry hooks |
| Testing | Vitest (unit) + Playwright (e2e) |
| Web Dashboard | Next.js 15, React 19, TanStack Query, Recharts |
| Desktop | Electron + Vite + React 19 + xterm.js |
| CLI | Commander, Ink (React for terminals) |
| VS Code | Extension API, esbuild bundle |
| Mobile | Expo SDK 52, React Native 0.76, Reanimated, FlashList |
| CI/CD | Docker, healthchecks, graceful shutdown |

## Documentation map

```
docs/
├── README.md                     ← you are here
├── AI_CONTEXT.md                 ← AI agent bootstrap (read this first if you are an LLM)
├── SYSTEM_OVERVIEW.md
├── ARCHITECTURE_INDEX.md
├── CODEBASE_MAP.md
├── FILE_RELATIONSHIPS.md
│
├── architecture/                 Architectural deep-dives
│   ├── README.md
│   ├── system-architecture.md
│   ├── authentication.md
│   ├── conversation-flow.md
│   ├── event-flow.md
│   ├── extension-flow.md
│   ├── provider-flow.md
│   ├── tool-execution.md
│   ├── agent-orchestration.md
│   └── deployment-flow.md
│
├── applications/                 Per-app docs (README, ARCHITECTURE, DEPENDENCIES, …)
│   ├── backend/
│   ├── dashboard/
│   ├── cli/
│   ├── desktop/
│   ├── mobile/
│   └── vscode/
│
├── backend/                      Backend-specific reference
│   ├── api/                      REST endpoint reference per domain
│   └── modules/                  Domain-module reference
│
├── database/                     Data model, collections, migrations
├── deployment/                   Docker, scaling, observability
├── telemetry/                    Logging, metrics, tracing
├── testing/                      Test strategy & commands
├── security/                     Auth, RBAC, encryption, threat model
├── providers/                    AI provider abstractions
├── agents/                       Agent/orchestrator design
├── tools/                        Built-in tools (shell, browser, git, …)
├── extensions/                   Extension system & marketplace
├── workflows/                    Common user workflows
├── examples/                     Copy-paste examples (curl, SDK, CLI)
└── reference/                    Glossary, changelog, known issues
```

## Where to start reading

| Audience | Start with |
|----------|------------|
| New engineer | `docs/architecture/system-architecture.md` → `docs/applications/backend/README.md` |
| Frontend / RN dev | `docs/applications/mobile/README.md` |
| AI agent / LLM | `docs/AI_CONTEXT.md` (this is also loaded into `docs/SYSTEM_OVERVIEW.md`) |
| Operator / SRE | `docs/deployment/README.md`, `docs/telemetry/README.md`, `docs/security/README.md` |
| Extension author | `docs/extensions/README.md` |
| AI integrator | `docs/providers/README.md`, `docs/agents/README.md` |

## Contributing

1. Fork / branch from `main`.
2. Run `npm run typecheck && npm test` in the package you change.
3. Add or update tests (the repo targets very high unit coverage).
4. Update the corresponding README in `docs/by-path/<path>/README.md`.
5. Keep modules small: one concern per file, depend on abstractions not concretions.

## License

Proprietary — CODER Enterprise.
