# Deployment

## Quick start (local)
```bash
cp .env.example .env     # fill in keys
npm install
npm run dev              # API on :3000
npm run queues:worker    # optional: background workers (separate shell)
docker compose up -d redis
```

## Production (Docker)
```bash
docker build -t coder-backend .
docker run -p 3000:3000 --env-file .env coder-backend
```

## Production (Kubernetes/compose/etc.)
- Run API + worker as separate deployments from the same image (workers run `node dist/queues/worker.js`).
- Provide managed Redis (Memorystore, ElastiCache) and Firebase project.
- Put TLS-terminating load balancer in front.
- Autoscale API based on RPS/CPU; scale workers based on queue depth.

## Environment variables
See `docs/applications/backend/CONFIGURATION.md` for the full list. Required:
`JWT_SECRET`, `ENCRYPTION_KEY`, `FIREBASE_PROJECT_ID`, Redis connection, at least one provider API key.

## Observability
- Logs: Pino JSON to stdout; collect via Fluent Bit / Vector / Cloud Logging.
- Metrics: scrape `GET /api/v1/metrics` with Prometheus (format is a JSON snapshot; convert or export to prom-text).
- Traces: set `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Health probes: `/health` (liveness) and `/api/v1/health/deep` (readiness).

## Rollout
- Rolling or blue/green. Graceful shutdown honors `SIGTERM` with drain.
- Schema changes in Firestore are additive; backfill if needed before rollout.

## Mobile/desktop/web
- Mobile: EAS builds + updates (OTA).
- Desktop: electron-builder + `electron-updater` for auto-updates.
- Dashboard: deploy Next.js to Vercel/Cloud Run/Node; set `NEXT_PUBLIC_API_URL`.
- CLI: publish to npm with `npm publish` from `packages/cli`.
- VS Code: publish with `vsce publish` from `packages/vscode`.
