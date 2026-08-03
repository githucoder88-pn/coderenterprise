# Infrastructure

## External dependencies
- **Firebase**
  - Authentication (email/password, OAuth, custom tokens)
  - Firestore (primary document database)
  - Cloud Storage (attachments, extension bundles)
- **Redis** (ioredis) — cache, rate limits, BullMQ queues, pub/sub
- **BullMQ** — durable background jobs (indexing, billing, extensions)
- **AI providers** — OpenAI, Anthropic, Gemini, OpenRouter, Groq, Ollama

## Adapters
`src/infrastructure/firebase/`
- `auth-client.ts` — Firebase Auth wrapper (verify tokens, create users)
- `firestore-client.ts` — Document CRUD, collection queries, transactions
- `storage-client.ts` — Signed-URL generation, file upload/download

`src/infrastructure/redis/`
- `redis-client.ts` — ioredis client factory
- `cache.ts` — JSON-serializing cache helper with TTLs

## ServiceProvider (`src/providers/service.provider.ts`)
Composition root. Constructs all concrete services and wires them into the DI
container (`src/core/container.ts`) for use by Hono routes and workers.
