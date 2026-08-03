# Telemetry Report

## Present

- Pino logger and request IDs are wired in `src/app.ts`.
- Metrics collector is exposed at `/api/v1/metrics`.
- Health service and health middleware exist.
- OpenTelemetry, Sentry, and Grafana-shaped configuration classes exist in `src/telemetry/integrations.ts`.

## Gaps

### AUD-012 — Telemetry facades are not exporter integrations
- **Severity:** High
- **Location:** `src/telemetry/integrations.ts:21-47,60-105`
- **Cause:** `initialize()` and `captureException()` log locally or generate IDs; no OpenTelemetry/Sentry SDK/exporter dependency is present.
- **Affected components:** traces, error reporting, dashboards, incident response.
- **Risk:** Operators may believe telemetry is being exported when it is not.
- **Required fix:** Integrate supported SDKs or rename/document these classes as local adapters.
- **Dependencies:** exporter endpoint, privacy policy, shutdown handling.
- **Estimated effort:** 2–4 days.
- **Suggested implementation:** Add exporter-backed initialization, flush on shutdown, redact secrets, and add a collector integration test.

### AUD-020 — Metrics are not connected to all advertised subsystems
- **Severity:** Medium
- **Location:** `src/telemetry/integrations.ts:191-192`
- **Cause:** active streams and queue depth are hard-coded to zero in the health result.
- **Affected components:** health dashboards, autoscaling, SLOs.
- **Risk:** False healthy capacity signals.
- **Required fix:** Source gauges from streaming and queue managers.
- **Dependencies:** queue implementation and provider streaming lifecycle.
- **Estimated effort:** 1–2 days.
- **Suggested implementation:** Register metric instruments at subsystem boundaries and test increments/decrements under failure.
