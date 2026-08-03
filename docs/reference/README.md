# Reference

## Glossary

| Term | Meaning |
|------|---------|
| Provider | An AI vendor or local model server (OpenAI, Anthropic, Ollama, …) |
| Model | A named model (e.g. `gpt-4o`, `claude-3-5-sonnet`). |
| Agent | A role-specific actor (planner, coder, reviewer, …) invoked by the orchestrator. |
| Tool | A strongly-typed callable (shell, git, browser, …) exposed to models. |
| Orchestrator | Plans and runs multi-agent DAGs. |
| Checkpoint | Snapshot of agent state for branching/rollback. |
| Extension | Third-party add-on; runs in a sandbox, can contribute tools/commands/prompts. |
| Workspace | A connected repository/directory with indexed files. |
| Memory | Short/long-term recall for conversations and agents. |
| Circuit breaker | Resilience pattern; trips on repeated failures to avoid cascades. |
| Load balancer | Routes provider calls across healthy instances/providers. |
| Request queue | Bounded concurrency + priority queue for outbound LLM calls. |
| SSE | Server-Sent Events — HTTP streaming used for chat. |

## HTTP status codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No content |
| 400 | Validation error |
| 401 | Missing/invalid auth |
| 403 | Forbidden (RBAC/ABAC denied) |
| 404 | Resource not found |
| 409 | Conflict (duplicate/version) |
| 429 | Rate limited / provider quota |
| 500 | Internal error |
| 503 | Provider unavailable (circuit open) |

## Error codes
`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`RATE_LIMITED`, `PROVIDER_ERROR`, `CIRCUIT_OPEN`, `TOOL_DENIED`, `INTERNAL`.

## Related docs
- Architecture docs in `docs/architecture/`
- Per-app docs in `docs/applications/`
