# Conversations API

Base: `/conversations`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List conversations (paginated) |
| POST | `/` | Create a conversation |
| GET | `/:id` | Get conversation metadata |
| PATCH | `/:id` | Update title/model/etc. |
| DELETE | `/:id` | Delete conversation |
| GET | `/:id/messages` | List messages |
| POST | `/:id/send` | Send a message (sync) |
| POST | `/:id/send/stream` | Send a message (SSE streaming) |
| POST | `/:id/branches` | Create branch from checkpoint |
| GET | `/:id/checkpoints` | List checkpoints |

## GET /conversations
Query: `?page=1&limit=20`
```json
{
  "data": [
    { "id": "c_1", "title": "Refactor auth", "model": "gpt-4o", "provider": "openai", "messageCount": 23, "updatedAt": "2024-…" }
  ],
  "pagination": { "page": 1, "total": 42, "hasMore": true }
}
```

## POST /conversations
Body: `{ "title": "...", "model": "gpt-4o", "provider": "openai", "workspaceId?": "..." }` → 201 with created conversation.

## POST /conversations/:id/send
Body: `{ "content": "...", "attachments?: [...], "tools?: [...]" }`
Response (200): full assistant message once complete.

## POST /conversations/:id/send/stream
Same body. Returns `text/event-stream`; see `docs/architecture/conversation-flow.md`.
