# Architecture Index

All architecture documents live in `docs/architecture/`. Each is a focused, diagram-backed deep dive.

| Document | Covers |
|----------|--------|
| [system-architecture.md](system-architecture.md) | High-level layered diagram, component inventory |
| [authentication.md](authentication.md) | AuthN/AuthZ flow, JWT, RBAC, API keys, biometrics |
| [conversation-flow.md](conversation-flow.md) | SSE streaming, context/memory, prompt templates |
| [event-flow.md](event-flow.md) | In-process EventBus vs BullMQ, event catalog |
| [extension-flow.md](extension-flow.md) | Extension sandbox, lifecycle, messaging, marketplace |
| [provider-flow.md](provider-flow.md) | Provider abstraction, load balancing, circuit breaker |
| [tool-execution.md](tool-execution.md) | Tool registry, MCP, shell/filesystem/git/docker/browser |
| [agent-orchestration.md](agent-orchestration.md) | Planner, registry, checkpoints, execution engine |
| [deployment-flow.md](deployment-flow.md) | Docker, workers, scaling, graceful shutdown |

Additional domain architecture:

- `docs/database/` — Firestore collections and schema
- `docs/security/` — threat model, encryption, rate limits
- `docs/telemetry/` — logs, metrics, traces
- `docs/providers/` — per-provider capability matrix
- `docs/agents/` — agent types and lifecycle
- `docs/tools/` — tool API and registration
- `docs/workflows/` — end-to-end user flows with sequence diagrams
