# Backend Architecture

```
src/
├── index.ts              Boot entry
├── app.ts                Hono app + middleware composition
├── config/               Zod-validated environment config
├── core/                 DI container, EventBus, Result type, base classes
├── types/                Shared domain types & error codes
├── middleware/           Hono middleware (auth, cors, rate-limit, logging, security, error)
├── api/
│   ├── index.ts          Route aggregator
│   └── routes/           One router file per domain (auth.routes.ts … workspace.routes.ts)
├── modules/              DDD modules (auth, users, orgs, billing, providers, …)
├── conversations/engine/ Streaming, context, memory, orchestrator, session
├── orchestrator/         Planner, execution engine, checkpoints, registry
├── intelligence/         Planning/reasoning/reflection/evaluation/coordination/optimization
├── knowledge/            Indexing, retrieval, summarization, memory
├── workspace/            Files, indexing, search, diff, snapshots, patches, editors, embeddings
├── tools/                Built-in tools + registry
├── extensions/           Sandbox/runtime/marketplace/lifecycle/permissions/...
├── marketplace/          Registry, publishers, installers, ratings, moderation
├── enterprise/           Org hierarchy, policies, compliance, security, deployments
├── cluster/              Coordination, events, workers, monitoring, queues, registry, scheduler, scaling
├── runtime/              Approvals, memory, policies, manager
├── simulation/           Bench/experiment harness
├── queues/worker.ts      BullMQ worker process entry
├── telemetry/            Logger, metrics, observability, OTel integrations
├── services/security/    Cross-cutting security primitives
├── infrastructure/       Firebase & Redis adapters
├── providers/            Composition root (service.provider.ts)
├── database/             Logical schema + seeds
└── tests/                Unit tests per subsystem
```

## Patterns
- DDD modules: each owns its `*.types.ts`, `*.service.ts`, `*.repository.ts`, `index.ts`.
- Repository pattern abstracts Firestore access.
- Result type (`ok()`/`err()`) for service returns.
- EventBus for in-process events, BullMQ for async work.
- Strategy pattern for providers, tools, load balancers.
- Ports/adapters around Firebase & Redis for testability.

See `../../architecture/` for deep dives.
