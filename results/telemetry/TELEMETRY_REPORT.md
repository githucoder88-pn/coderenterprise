# Telemetry Report

## Findings

- `MetricsCollector` is created in `src/app.ts` and `/metrics` is mounted.
- Request logging middleware records request metrics.
- Analytics service exists and is wired to Redis cache/metrics.
- Distributed tracing/export configuration was not found as an integrated app startup concern.
- Desktop/CLI/mobile/VS Code client telemetry is not consistently implemented.

## Gaps

- No end-to-end trace IDs across clients, backend, provider calls and tool execution.
- No verified telemetry for Monaco completions, terminal sessions, workspace indexing, queue jobs or agent execution.
- No alerting/runbook documentation.

## Required Work

1. Standardize correlation IDs across all clients.
2. Add provider/tool/workspace/orchestrator metrics.
3. Add dashboards and alert thresholds.
4. Add telemetry tests that assert events are emitted for critical flows.
