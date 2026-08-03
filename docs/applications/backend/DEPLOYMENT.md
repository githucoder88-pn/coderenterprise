# Deployment

## Docker
See repository root `Dockerfile` and `docker-compose.yml`.

- Base image: `node:24-alpine`, non-root user `appuser:appgroup`.
- Exposes port **3000**, HEALTHCHECK hits `/health` every 30s.
- `docker compose up` spins up `app` + `redis`.

```bash
docker build -t coder-backend .
docker run --rm -p 3000:3000 --env-file .env coder-backend
```

## Health endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /health` | No | Shallow liveness (starts responding immediately) |
| `GET /api/v1/health/deep` | Yes | Verifies Firebase + Redis + at least one provider healthy |

## Production checklist

- [ ] Set strong `JWT_SECRET` (≥32 bytes) and `ENCRYPTION_KEY`.
- [ ] Put TLS in front of the Node process (Nginx/ALB/Cloudflare).
- [ ] Restrict CORS origins to known clients.
- [ ] Configure Redis password and TLS if off-instance.
- [ ] Run separate worker processes (`npm run queues:worker`) for heavier queues.
- [ ] Enable structured log shipping.
- [ ] Set rate limits appropriate to your plan.
- [ ] Provision Firebase IAM least-privilege service account.
- [ ] Set up `OTEL_EXPORTER_OTLP_ENDPOINT` for metrics/traces.

## Horizontal scaling

- API pods are stateless; scale behind a load balancer.
- Session state lives in Firebase/Redis (no in-memory sessions).
- BullMQ requires a shared Redis; workers scale independently.
- Avoid sticky sessions — not needed.

## Upgrade procedure

1. Run the new image alongside the old (blue/green or rolling).
2. Wait for health checks to pass.
3. Send SIGTERM to old pods (10–30s drain).
4. Watch error-rate and queue-depth dashboards.
5. If regressions appear, roll back by routing traffic to previous image.
