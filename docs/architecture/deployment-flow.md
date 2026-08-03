# Deployment Flow

## Topology

```
                ┌──────────────┐
   Clients ────►│   LB / TLS   │ (Nginx / ALB / Cloudflare)
                └──────┬───────┘
                       ▼
        ┌───────────────────────────────┐
        │  API fleet (Docker, Node 22)  │◄──┐
        └──────┬───────────────┬────────┘   │
               │               │            │
               ▼               ▼            │
        ┌────────────┐  ┌─────────────┐     │
        │  Firebase  │  │ Redis cluster│     │ BullMQ
        │ Auth+Store │  │ + queue workers ───┘
        └────────────┘  └─────────────┘
               │
               ▼
        ┌────────────┐
        │ AI provider│ (OpenAI, Anthropic, …)
        └────────────┘
```

## Building

```bash
# Backend
npm run build       # tsc → dist/
npm run docker:build

# Dashboard
cd dashboard && npm run build   # .next/ standalone output

# Desktop
cd desktop && npm run build     # dist-electron + bundle

# CLI
cd packages/cli && npm run build

# VS Code
cd packages/vscode && npm run build

# Mobile (OTA / stores)
cd apps/mobile && npx eas build   # Expo Application Services
```

## Docker
The production `Dockerfile` is a multi-stage build:
1. `base` — node:24-alpine, pnpm prepared.
2. `deps` — install (including devDep for build).
3. `build` — copy source, run `pnpm build`, then prune to prod.
4. `runtime` — non-root user `appuser:appgroup`, HEALTHCHECK via `/health`,
   exposes port 3000.

Compose brings up `app` + `redis` with health dependencies.

## Configuration

All runtime config is env-based, validated by `src/config/index.ts`. See
`../deployment/configuration.md`.

## Observability

- Structured Pino JSON logs → stdout → collector (Loki / CloudWatch / Datadog).
- Prometheus-compatible metrics snapshot at `GET /api/v1/metrics`.
- OpenTelemetry exporter endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`.
- `/health` (shallow) and `/api/v1/health/deep` (deep) probes.
- BullMQ dashboard can be mounted via `bull-board` in production if desired.

## Scaling

- Stateless API: horizontally autoscale behind LB.
- Redis cluster for rate-limits, queues, pub/sub.
- BullMQ workers can run as separate deployments sized independently.
- Firebase scales transparently.

## Graceful shutdown

1. SIGTERM → HTTP server stops accepting new connections.
2. Wait for in-flight requests (configurable timeout).
3. Pause queue processing; finish current jobs.
4. Close Redis/Firebase clients.
5. Process exits 0.

## CI/CD expectations

- All tests (`npm test`) must pass per package.
- `npm run typecheck` strict.
- Docker image built and pushed on tag; semantic versioning.
- Mobile releases cut through Expo EAS with separate channels for internal/staging/prod.
