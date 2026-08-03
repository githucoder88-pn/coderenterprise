# Backend Application (`/`)

> Production-grade Hono/Node server exposing CODER's REST + SSE API,
> orchestrating agents, providers, tools, billing, and persistence.

## Purpose

The backend is the **single source of truth** for all client surfaces
(mobile, dashboard, CLI, desktop, VS Code). It implements:

- Authentication & authorization (Firebase + JWT + RBAC + API keys)
- Conversations with server-sent-events streaming
- Multi-agent orchestration (planning, execution, checkpoints)
- AI provider abstraction with circuit breakers, load balancing, fallbacks
- Workspace indexing, search, git/diff, snapshots
- Knowledge/memory system with embeddings
- Tool runtime (shell, filesystem, git, browser, docker, mcp)
- Extension system + marketplace
- Billing, analytics, telemetry, audit logs
- Distributed clustering primitives
- Enterprise: org hierarchies, policies, compliance, deployments

## Tech stack

- Runtime: **Node.js 22+** (ESM)
- Framework: **Hono** (web-standard fetch API)
- Validation: **Zod**
- DB: **Firebase Firestore**, **Firebase Auth**, **Cloud Storage**
- Cache/Queues: **Redis** (ioredis), **BullMQ**
- Logging: **Pino**
- Tests: **Vitest** (unit) + **Playwright** (e2e)
- Container: **Docker** (multi-stage, non-root)

## Entry points

| File | Purpose |
|------|---------|
| `src/index.ts` | Process entry: loads config, boots app, signal handlers |
| `src/app.ts` | Factory `createApp(config)`: wires middleware, services, router, server |
| `src/api/index.ts` | Central Hono router that mounts all domain routes under `/api/v1` |
| `src/providers/service.provider.ts` | Composition root; constructs all services via DI container |
| `src/queues/worker.ts` | BullMQ worker entry (run `npm run queues:worker`) |
| `src/database/seeds/index.ts` | Seed script |

## Run locally

```bash
cp .env.example .env
# edit with Firebase, Redis, AI provider keys
npm install
npm run dev             # tsx watch on src/index.ts
# in another shell, optional:
npm run queues:worker   # process background jobs
```

## Testing

```bash
npm test                # Vitest, ~154 unit tests across subsystems
npm run test:coverage
npm run test:e2e        # Playwright
```

## Docs in this folder

- [ARCHITECTURE.md](ARCHITECTURE.md) — layers, modules, patterns
- [DEPENDENCIES.md](DEPENDENCIES.md) — direct dependency map
- [CONFIGURATION.md](CONFIGURATION.md) — env vars, config schema
- [DEPLOYMENT.md](DEPLOYMENT.md) — Docker, scaling, observability
- [TESTING.md](TESTING.md) — how tests are organized
- [SECURITY.md](SECURITY.md) — threat model & hardening
- [CHANGELOG.md](CHANGELOG.md)
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
