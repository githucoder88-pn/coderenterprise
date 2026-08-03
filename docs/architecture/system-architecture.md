# System Architecture

## Layered architecture

```
┌────────────────────────────────────────────────────┐
│  Clients (mobile, web, CLI, desktop, VS Code)      │  Presentation
├────────────────────────────────────────────────────┤
│  API (Hono routes + middleware)                    │  Interface adapters
├────────────────────────────────────────────────────┤
│  Services / Domain (modules/, conversations/,      │  Application
│  orchestrator/, tools/, knowledge/, intelligence/) │  + Domain
├────────────────────────────────────────────────────┤
│  Repositories / Providers / Infrastructure clients │  Adapters
├────────────────────────────────────────────────────┤
│  Firebase / Redis / BullMQ / External AI           │  External
└────────────────────────────────────────────────────┘
```

## Key patterns

### Dependency injection
`src/core/container.ts` is a tiny IoC container with singleton/transient registrations
and parent (child container) support. `src/providers/service.provider.ts` is the
composition root where every concrete service is wired.

### Repository pattern
All persistence goes through a repository. `BaseRepository<T>` in
`src/core/base-repository.ts` defines CRUD; concrete repositories in
`src/modules/*/*.repository.ts` implement against Firebase (or Redis).

### Result pattern
Service methods return `Result<T, AppError>` (`ok(data)` / `err(code, message)`).
Controllers never throw; `src/middleware/error-handler.ts` converts failures to HTTP
responses consistently.

### Event-driven
The in-process `EventBus` (`src/core/event-bus.ts`) routes domain events
(`conversation.created`, `agent.completed`, …). Cross-process work goes through
BullMQ queues (`src/queues/worker.ts`).

### Strategy pattern
- AI providers implement `BaseProvider`; `ProviderFactory` builds them by name.
- Load balancers (`round-robin`, `least-latency`, `weighted-random`, `priority`) are strategies.
- Tools implement a common `Tool` interface and register with `ToolRegistry`.

### Ports and adapters
Firestore, Firebase Auth, Redis, and each AI provider are behind interfaces
(`IAuthClient`, `IRedisClient`, `BaseProvider`). Tests replace them with fakes.

## Data flow (write path)

```
HTTP POST /conversations/:id/send
  → routes/conversations.routes
  → conversation service (Result-based)
    → repository saves user message → Firestore
    → emits Conversation.MessageCreated
    → streaming-engine:
        → ProviderRouter → LB → CB → Provider
        → SSE writes delta chunks back
        → on complete, finalizes message, emits MessageCompleted
    → queue listener updates analytics, knowledge memory
  ← SSE stream to client
```

## Scalability
- Stateless API servers; sessions in JWT + Firestore.
- Horizontal scale via Docker/Kubernetes; Redis for cross-instance coordination.
- BullMQ handles background work (indexing, billing, extension sandboxes).
- Circuit breakers + load balancer prevent provider cascades.
- Rate limiting and quotas enforced per API key and per user.
