# modules

**Purpose:** Domain modules (DDD): each module owns types, service, repository, and index.

## Subdirectories

| Path | Purpose |
|------|---------|
| [analytics/](analytics/) | Usage, quota, invoices. |
| [apikeys/](apikeys/) | API key CRUD and scope enforcement. |
| [audit/](audit/) | Append-only audit log. |
| [auth/](auth/) | Authentication service (sign-in/up, token issuance). |
| [billing/](billing/) | Billing plans and subscription lifecycle. |
| [conversations/](conversations/) | Conversation persistence. |
| [extensions/](extensions/) | Extension management metadata. |
| [health/](health/) | Liveness/readiness checks. |
| [models/](models/) | Model registry. |
| [notifications/](notifications/) | In-app and push notification delivery. |
| [organizations/](organizations/) | Organization CRUD and membership. |
| [payments/](payments/) | Payment processor abstraction. |
| [prompts/](prompts/) | Prompt library service. |
| [providers/](providers/) | AI provider framework and resilience primitives. |
| [rbac/](rbac/) | Role-based access control. |
| [secrets/](secrets/) | Encrypted secret storage. |
| [teams/](teams/) | Team management. |
| [users/](users/) | User CRUD. |
| [webhooks/](webhooks/) | Outbound webhook delivery with retries. |
| [workspaces/](workspaces/) | Workspace metadata records. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
