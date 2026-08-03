# Architecture Report

## Inventory

| Area | Evidence | Assessment |
|---|---|---|
| Backend | `src/index.ts`, `src/app.ts`, `src/api/`, `src/modules/` | Clear composition root and domain separation. |
| Dashboard | `dashboard/`, Next.js manifest | Present; independent package and tests. |
| Desktop | `desktop/electron/`, `desktop/renderer/` | Present; Electron/Vite architecture. |
| Mobile | `apps/mobile/app/`, Expo manifest | Present; Expo Router entry. |
| CLI | `packages/cli/src/` | Present; Commander/Ink application. |
| VS Code | `packages/vscode/src/` | Present; activation, commands, views, API client. |
| Infrastructure | `src/infrastructure/firebase`, `src/infrastructure/redis` | Adapter boundaries exist. |
| Providers | `src/modules/providers/implementations/` | Six provider adapters exist. |
| Orchestration | `src/orchestrator`, `src/runtime`, `src/cluster` | Broad code surface; production startup wiring is incomplete. |

## Runtime wiring

`src/app.ts` creates logger, metrics, Redis, Firebase, service provider, middleware, API router, and HTTP server. Redis is connected on startup and disconnected on shutdown. Firebase clients are constructed but do not have an explicit startup connection phase. `src/providers/service.provider.ts` composes many services, but the API registry mounts only a subset of available routers.

## Gaps

- `src/api/index.ts` imports and mounts core routers, but does not mount the existing tools, orchestrator, intelligence, knowledge, cluster, distributed, simulation, runtime, extensions, enterprise, or marketplace route files.
- `ServiceProvider` does not expose the orchestrator, intelligence, knowledge, cluster, simulation, runtime, or marketplace services required by those route files.
- `src/queues/worker.ts` contains commented-out BullMQ initialization.
- No root workspace manifest coordinates the six independent package manifests.
- No documented dependency graph, deployment topology, or cross-app contract test exists.

## Issue register

### AUD-007 — Unmounted application capabilities
- **Severity:** High
- **Location:** `src/api/index.ts:17-34,45-66`; `src/providers/service.provider.ts:44-66`
- **Cause:** Route files and feature directories were added without completing composition-root registration.
- **Affected components:** tools, agents/orchestrator, intelligence, knowledge, extensions, marketplace, cluster, distributed, simulation, runtime, enterprise.
- **Risk:** Features appear available in source but are unreachable through the backend API.
- **Required fix:** Define service ownership and explicitly compose and mount supported routes; remove or mark unsupported routes.
- **Dependencies:** Service constructors, auth/RBAC policy, API contract tests.
- **Estimated effort:** 3–5 days.
- **Suggested implementation:** Create a route/service registration matrix, wire one bounded context at a time, and add route smoke tests.

### AUD-009 — No cross-application architecture contract
- **Severity:** Medium
- **Location:** repository root; client package manifests
- **Cause:** Applications are colocated but have no workspace orchestration or shared API schema generation.
- **Affected components:** dashboard, desktop, mobile, CLI, VS Code.
- **Risk:** Client URLs, auth headers, streaming behavior, and payloads can drift.
- **Required fix:** Establish a supported workspace/release model and generated API contracts.
- **Dependencies:** CI and package-manager decision.
- **Estimated effort:** 2–4 days.
- **Suggested implementation:** Publish a versioned OpenAPI/client contract and validate every client against it in CI.
