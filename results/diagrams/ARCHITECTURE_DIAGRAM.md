# Architecture Diagram

```text
 clients
 ├─ dashboard (Next.js)
 ├─ desktop (Electron)
 ├─ mobile (Expo)
 ├─ CLI
 └─ VS Code extension
             │ HTTP/SSE
             ▼
       Hono backend (`src/app.ts`)
       ├─ middleware: request-id, errors, security, CORS, logging, rate-limit
       ├─ API route registry (`src/api/index.ts`)
       ├─ service composition (`src/providers/service.provider.ts`)
       │  ├─ auth/RBAC/users/orgs/billing/conversations/workspaces
       │  ├─ providers/tools/orchestration/knowledge/extensions
       │  └─ analytics/notifications/webhooks/enterprise
       ├─ Firebase adapters: Auth / Firestore / Storage
       ├─ Redis adapter: cache / rate limits
       ├─ provider router: OpenAI / Anthropic / Gemini / OpenRouter / Ollama / Groq
       └─ telemetry: Pino / metrics / health
```

**Important:** The diagram represents source-level intent, not verified runtime connectivity. Unmounted route families and placeholder workers are tracked in `AUD-004`, `AUD-007`, and `AUD-025`.
