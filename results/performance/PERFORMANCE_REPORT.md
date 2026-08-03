# Performance Report

## Current design observations

- Redis cache and rate-limiter adapters are available.
- Provider router includes circuit breaker, queue, fallback, and load-balancing code.
- Workspace indexing loops files sequentially and indexes content in memory.
- Distributed event bus retains up to 50,000 events in process memory.
- Health aggregation runs additional checks serially.

## Risks

### AUD-021 — In-memory state limits horizontal scalability
- **Severity:** High
- **Location:** event bus and indexing implementations under `src/cluster/events/` and `src/workspace/indexing/`
- **Cause:** event history and index maps are process-local.
- **Affected components:** clustered deployments, recovery, memory usage, search freshness.
- **Risk:** state divergence, unbounded per-process memory growth, and loss on restart.
- **Required fix:** Define durable ownership and eviction/persistence policies.
- **Dependencies:** Firestore/Redis schema and queue design.
- **Estimated effort:** 3–5 days.
- **Suggested implementation:** Bound memory by bytes/count, persist required state, and add load/restart tests.

### AUD-022 — Sequential indexing and health checks
- **Severity:** Medium
- **Location:** `src/workspace/indexing/indexer.ts:49-56`; `src/telemetry/integrations.ts:168-176`
- **Cause:** files and additional health checks are processed one at a time.
- **Affected components:** large workspaces and health endpoint latency.
- **Risk:** slow startup/indexing and increased tail latency.
- **Required fix:** Add bounded concurrency and per-check timeouts.
- **Dependencies:** resource limits and cancellation semantics.
- **Estimated effort:** 1–2 days.
- **Suggested implementation:** Use a bounded worker pool, skip unchanged hashes, and enforce health-check deadlines.

## Missing evidence

No benchmark, load, soak, memory, streaming-concurrency, queue-throughput, or failover result is committed. Performance claims remain unverified.
