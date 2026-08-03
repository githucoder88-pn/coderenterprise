# Event Flow

CODER uses two event layers:

1. **In-process EventBus** — synchronous/awaitable domain events within one server.
2. **BullMQ queues** — cross-process, persistent jobs (worker process).

## EventBus

Defined in `src/core/event-bus.ts`. Type-safe: `emit(DomainEventPayload)` → `on(event, handler)`.

Typical events (see `src/types/index.ts` for the canonical list):

| Event | Producer | Consumer(s) |
|-------|----------|-------------|
| `user.created` | auth service | audit, billing |
| `conversation.created` | conversation service | analytics |
| `conversation.message.sent` | streaming engine | memory, notifications, billing |
| `conversation.completed` | streaming engine | memory summarization, usage tracking |
| `agent.task.started` | execution engine | UI push, logs |
| `agent.task.completed` | execution engine | checkpoint, audit, notifications |
| `agent.task.failed` | execution engine | retry policy, alerts |
| `provider.circuit.opened` | resilience | metrics, logs, health |
| `extension.installed` | extension lifecycle | sandbox, registry |
| `billing.invoice.paid` | billing service | quota refresh, audit |

## Queues (BullMQ)

- `conversation-summarization` — summarize long conversations
- `workspace-indexing` — file tree → embeddings
- `billing-sync` — sync provider usage
- `extension-sandbox-run` — isolated extension execution
- `notification-dispatch` — push/email notifications
- `agent-timeout-watchdog` — monitor long-running agents

Workers boot from `src/queues/worker.ts` (same binary as the API, run with
`npm run queues:worker`).

## Sequence: message + analytics

```
POST /send/stream  ──► ConversationService ──► EventBus.emit(message.sent)
                                           ├──► NotificationHandler (in-proc)
                                           └──► BullMQ.add('billing-sync')
                                                                │
                                                                ▼
                                                          Worker process ─► Analytics API
```
