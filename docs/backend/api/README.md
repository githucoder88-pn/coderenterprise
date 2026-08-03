# API Reference

Base URL: `/api/v1` (configurable via `API_PREFIX`).
Content type: `application/json`. Auth: `Authorization: Bearer <JWT>` or `X-API-Key: <key>`.

## Response envelope
Success:
```json
{ "data": { ... } }
```
Error (RFC 7807-style):
```json
{ "error": { "code": "UNAUTHORIZED", "message": "...", "details": {} } }
```

## SSE streaming
`POST /conversations/:id/send/stream` → `text/event-stream`
```
data: {"delta":{"content":"Hel"}}
data: {"delta":{"content":"lo"}}
data: {"delta":{"tool_calls":[...]}}
data: "[DONE]"
```

## Domain reference

- [auth.md](auth.md)
- [conversations.md](conversations.md)
- [workspaces.md](workspaces.md)
- [providers.md](providers.md)
- [agents.md](agents.md)
- [extensions.md](extensions.md)
- [billing.md](billing.md)
- [notifications.md](notifications.md)
- [analytics.md](analytics.md)
- [models.md](models.md)
- [tools.md](tools.md)
- [health.md](health.md)
