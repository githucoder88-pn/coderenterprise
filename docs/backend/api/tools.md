# Tools API

Base: `/tools`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `?category=<c>` | List registered tools |
| POST | `/:name/invoke` | Invoke a tool (admin/dev) |
| GET | `/health` | Tool registry health |

Tools are normally invoked by the orchestrator, not by end-user API calls, but these endpoints power dashboards and testing.
