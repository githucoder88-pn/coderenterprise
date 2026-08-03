# File Relationships

The high-level dependency graph, per layer.

## Backend dependency layers

```
┌──────────────────────────────────────────────────────┐
│   HTTP layer (src/api/*, src/middleware/*)           │  depends on services
├──────────────────────────────────────────────────────┤
│   Domain modules (src/modules/*,                     │
│   src/conversations, src/orchestrator, src/tools,    │
│   src/knowledge, src/intelligence, src/workspace,    │
│   src/extensions, src/marketplace, src/enterprise,  │
│   src/cluster, src/runtime, src/simulation)          │  depends on core + infra
├──────────────────────────────────────────────────────┤
│   Core (src/core/*: container, event-bus, base-*)    │  no internal deps
│   Types (src/types/*)                               │
│   Config (src/config/*)                             │
├──────────────────────────────────────────────────────┤
│   Providers (src/providers/*)  — composition root    │  wires everything
├──────────────────────────────────────────────────────┤
│   Infrastructure (src/infrastructure/*: firebase,   │
│   redis) + Telemetry (src/telemetry)                │  wrappers over external libs
└──────────────────────────────────────────────────────┘
```

## Entry point chain

```
src/index.ts
  └─ loadConfig()                       src/config/index.ts
  └─ createApp(config)                  src/app.ts
       ├─ createRedisClient             src/infrastructure/redis
       ├─ createFirebaseClients         src/infrastructure/firebase
       ├─ createLogger / createMetrics  src/telemetry
       ├─ new Container()               src/core/container
       ├─ registerServices             src/providers/service.provider.ts
       │    └─ creates services (auth, users, orgs, billing, analytics, conversations, providers, …)
       ├─ createApiRouter               src/api/index.ts
       │    └─ mounts auth/health/public then authMiddleware then protected routers
       └─ start @hono/node-server on PORT
```

## Client-to-server call graph

```
Mobile:  services/api.ts         ─fetch()→  Hono routes → service → repository/providers
Web:     lib/api.ts              ─fetch()→  same
CLI:     services/api.ts         ─fetch()→  same
Desktop: services/api-bridge.ts  ─fetch()→  same
VSCode:  services/api-client.ts  ─fetch()→  same
```

All clients share:

- Bearer-token auth (JWT after sign-in)
- Same `/api/v1/*` endpoint surface
- SSE streaming for `/conversations/:id/send/stream` via EventSource/fetch reader
- `{ data: … }` response envelope; errors shaped as `{ error: { code, message, details? } }`

## Import rules enforced by convention

1. A module must import only from:
   - its own folder (for types/repos/services in that module),
   - `@core/*`, `@types/*`, `@config/*`, `@telemetry/*`,
   - `@modules/providers` (intentionally shared resilience/router),
   - `@infrastructure/*` (only through interfaces),
   - other modules only via service provider injection.
2. Cross-module imports should be avoided; pass dependencies via constructor injection.
3. Clients must never import backend code; they are independent packages.
4. `providers/service.provider.ts` is the only place where concrete classes are wired.

## State flow (conversation with streaming)

```
User types → Composer → api.streamMessage(conversationId, {content})
                  │
                  ▼ fetch POST …/send/stream  (SSE)
       src/conversations/engine/streaming-engine.ts
                  │
                  ├── saves user message (conversation.service → repository → Firestore)
                  ├── calls ProviderRouter
                  │       └→ LoadBalancer → CircuitBreaker → RequestQueue → BaseProvider
                  │             (on error: fallback to next provider)
                  ├── yields SSE chunks  data: {"delta":{"content":"…"}}
                  ▼
Client appends delta → renders MessageBubble (MarkdownRenderer/CodeBlock)
                  │
                  └── on [DONE], finalizes assistant message, emits domain event
```

## Extension system

```
extension.zip  → marketplace/installer  →  extension-registry
                                         ↓
                                   lifecycle: install → enable → sandbox load
                                         ↓
                                   message-bus for IPC + permissions gating
                                         ↓
                                   runtime exposes hooks (prompts, tools, UI)
```

## Tests mirror source

- `src/tests/unit/<subsystem>/<name>.test.ts` ↔ `src/<subsystem>/<name>.ts`
- `<package>/tests/unit/*.test.ts` for each client package

## Common imports cheatsheet

| Symbol | Where |
|--------|-------|
| `Result<T,E>`, `ok()`, `err()`, `createError()`, `ErrorCode` | `@types/` (`src/types/index.ts`) |
| `BaseService` | `@core/base-service` |
| `BaseRepository` | `@core/base-repository` |
| `Container`, `createToken()` | `@core/container` |
| `EventBus`, `IEventBus` | `@core/event-bus` |
| `loadConfig()` | `@config/index` |
| `ServiceProvider` | `@providers/service.provider` |
| `BaseProvider` | `@modules/providers/base-provider` |
| `ProviderRouter` | `@modules/providers/provider-router` |
| `ToolRegistry` | `src/tools/registry/tool-registry` |
| `ExecutionEngine` | `src/orchestrator/execution/execution-engine` |
| Mobile theme hook | `@/theme/theme` (`useTheme`, `useColors`) |
| Mobile safe area | `@/components/common/SafeLayout` |
