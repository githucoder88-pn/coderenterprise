# src

**Purpose:** Part of the CODER backend.

## Subdirectories

| Path | Purpose |
|------|---------|
| [analytics/](analytics/) | Analytics services. |
| [api/](api/) | Hono API router that mounts all domain routes and applies middleware. |
| [cluster/](cluster/) | Distributed clustering for horizontal scale-out. |
| [config/](config/) | Zod-validated environment configuration. |
| [conversations/](conversations/) | Conversation engine: streaming, context, memory, prompts, sessions. |
| [core/](core/) | Framework primitives: DI container, event bus, base service/repository classes, Result type. |
| [database/](database/) | Logical schema and seed scripts. |
| [enterprise/](enterprise/) | Enterprise-only features. |
| [extensions/](extensions/) | Runtime extension framework. |
| [infrastructure/](infrastructure/) | Adapters to external services (Firebase, Redis). |
| [intelligence/](intelligence/) | Higher-order reasoning layers. |
| [knowledge/](knowledge/) | RAG layer: indexing, memory, retrieval, summarization. |
| [marketplace/](marketplace/) | Extension marketplace services. |
| [middleware/](middleware/) | Hono middleware: auth, CORS, rate-limit, logging, security headers, error handler. |
| [modules/](modules/) | Domain modules (DDD): each module owns types, service, repository, and index. |
| [orchestrator/](orchestrator/) | Multi-agent orchestration. |
| [providers/](providers/) | Composition root. |
| [queues/](queues/) | BullMQ worker entry. |
| [runtime/](runtime/) | Runtime approvals/memory/policies. |
| [services/](services/) | Cross-cutting services. |
| [simulation/](simulation/) | Benchmark/experiment harness. |
| [telemetry/](telemetry/) | Logging, metrics, observability, OTel integrations. |
| [tests/](tests/) | Tests and helpers. |
| [tools/](tools/) | Built-in tools and tool registry. |
| [types/](types/) | Shared TypeScript types. |
| [workspace/](workspace/) | Repository/workspace services. |

## Files

| File | Responsibility |
|------|----------------|
| `app.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
