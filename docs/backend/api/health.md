# Health API

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/health` | No | Shallow (process up) |
| GET | `/api/v1/health/deep` | Yes | Firebase + Redis + at least one provider reachable |
| GET | `/api/v1/metrics` | Yes | Prometheus-style metrics snapshot |
