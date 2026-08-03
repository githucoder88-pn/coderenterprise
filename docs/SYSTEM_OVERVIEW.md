# System Overview

## Product

CODER is an **enterprise AI development platform**. It lets teams chat with
providers (OpenAI, Anthropic, Gemini, OpenRouter, Ollama, Groq), run multi-agent
workflows (planning, research, coding, review, testing, debugging,
documentation), index and search workspaces, and expose the same capability
through five client surfaces.

## Components

```
                       ┌──────────────┐
                       │   VS Code    │ ─┐
                       └──────────────┘  │
                       ┌──────────────┐  │
                       │  Desktop app │  │  REST + SSE
                       └──────────────┘  │  /api/v1/*
                       ┌──────────────┐  │  (auth: JWT, API key)
                       │  CLI (Ink)   │  ├──► ┌───────────┐
                       └──────────────┘  │    │           │
                       ┌──────────────┐  │    │  Backend  │
                       │   Web Dash   │  │    │  Hono/Node│
                       └──────────────┘  │    │           │
                       ┌──────────────┐  │    └─────┬─────┘
                       │ React Native │ ─┘          │
                       └──────────────┘         ┌────┴─────┐
                                                │ Firebase │ Redis/BullMQ
                                                └──────────┘
```

| Process | Runtime | Primary job |
|---------|---------|-------------|
| Backend | Node 22, Hono | Serve REST/SSE, coordinate agents, persist state, queue work |
| Worker (same binary) | Node 22, BullMQ | Run async jobs (indexing, billing, extension sandbox) |
| Dashboard | Next.js 15 (RSC + client TanStack Query) | Admin/analytics UI |
| Desktop | Electron 33 + Vite + React 19 | Native-style desktop workspace with integrated terminal |
| CLI | Node 22, Commander + Ink | Terminal chat, automation, scripting |
| VS Code | Extension host, esbuild-bundled | Editor-native chat, inline completions, code actions |
| Mobile | Expo 52, RN 0.76 | iOS/Android client with streaming, voice, attachments |

## Request lifecycle

```
Client
 │
 ├─ Auth (Firebase ID token → JWT cookie/bearer)
 ▼
Hono app  →  request-id → security-headers → cors → rate-limit → request-logger
 │
 ├─ auth middleware (verify JWT, load RBAC role)
 ▼
Domain route (src/api/routes/*.routes.ts)
 │
 ▼
Service (src/modules/*/*.service.ts or src/<domain>/**)
 │
 ├─ Domain events → EventBus → in-process subscribers
 ├─ Queued work   → BullMQ  → worker
 ├─ Persistence   → Repository → Firebase client
 └─ AI call       → ProviderRouter → load-balancer → circuit-breaker → BaseProvider
                                                         │
                                       (on failure) fallback to next provider
```

## State locations

| State | Store | Owners |
|-------|-------|--------|
| Users, orgs, teams, billing, providers, api keys, conversations | Firestore (collections in `src/database/schema.ts`) | Repository classes |
| Sessions / refresh tokens | Firebase Auth + SecureStorage (mobile) / httpOnly cookies (web) | `modules/auth` |
| Cache, rate limits, queue state, pub/sub | Redis (`infrastructure/redis/*`) | Redis client |
| Background work | BullMQ queues (`src/queues/worker.ts`) | Workers |
| Realtime streaming | HTTP SSE response streams | Conversations engine |
| Client UI state | Zustand stores per client | Each client |
| Client cache | TanStack Query + MMKV (mobile) / localStorage (web) | Each client |
| Telemetry | Pino logger → stdout → OTLP collector optionally | `telemetry/` |

## Cross-cutting concerns

- **Auth:** Firebase Authentication + JWT middleware, RBAC in `src/modules/rbac/`, API-key auth for server-to-server.
- **Resilience:** Circuit breaker + load balancer + request queue on every provider call (`src/modules/providers/resilience/`).
- **Audit:** Every mutation writes an audit log entry (`src/modules/audit/`).
- **Security:** CORS, CSRF, XSS filters, zero-trust helpers, encryption service, rate limiting, abuse detection (`src/services/security/`).
- **Observability:** structured Pino logs (request-id correlation), metrics snapshots, OpenTelemetry hooks.
- **Errors:** `AppError` + `Result<T,E>`; Hono error middleware maps to RFC-7807-style responses.
- **Validation:** Zod schemas for config, request bodies, repository DTOs.
