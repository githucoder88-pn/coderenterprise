# routes

**Purpose:** One Hono router file per domain (auth, conversations, providers, …).

## Files

| File | Responsibility |
|------|----------------|
| `analytics.routes.ts` | HTTP route handlers. |
| `apikeys.routes.ts` | HTTP route handlers. |
| `audit.routes.ts` | HTTP route handlers. |
| `auth.routes.ts` | HTTP route handlers. |
| `billing-analytics.routes.ts` | HTTP route handlers. |
| `billing.routes.ts` | HTTP route handlers. |
| `cluster.routes.ts` | HTTP route handlers. |
| `conversation-engine.routes.ts` | HTTP route handlers. |
| `conversations.routes.ts` | HTTP route handlers. |
| `dashboard.routes.ts` | HTTP route handlers. |
| `distributed.routes.ts` | HTTP route handlers. |
| `enterprise.routes.ts` | HTTP route handlers. |
| `extensions.routes.ts` | HTTP route handlers. |
| `health.routes.ts` | HTTP route handlers. |
| `intelligence.routes.ts` | HTTP route handlers. |
| `knowledge.routes.ts` | HTTP route handlers. |
| `marketplace.routes.ts` | HTTP route handlers. |
| `models.routes.ts` | HTTP route handlers. |
| `notifications.routes.ts` | HTTP route handlers. |
| `orchestrator.routes.ts` | HTTP route handlers. |
| `organizations.routes.ts` | HTTP route handlers. |
| `prompts.routes.ts` | HTTP route handlers. |
| `providers.routes.ts` | HTTP route handlers. |
| `runtime.routes.ts` | HTTP route handlers. |
| `secrets.routes.ts` | HTTP route handlers. |
| `simulation.routes.ts` | HTTP route handlers. |
| `tools.routes.ts` | HTTP route handlers. |
| `users.routes.ts` | HTTP route handlers. |
| `webhooks.routes.ts` | HTTP route handlers. |
| `workspace.routes.ts` | HTTP route handlers. |
| `workspaces.routes.ts` | HTTP route handlers. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
