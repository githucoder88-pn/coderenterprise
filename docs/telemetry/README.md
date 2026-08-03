# Telemetry

Structured logging, metrics, and OpenTelemetry hooks.

## Logger (`src/telemetry/logger.ts`)
- Pino JSON logger with request-id correlation.
- Levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`.
- Dev: `pino-pretty`; prod: plain JSON.

## Metrics (`src/telemetry/metrics.ts`)
Lightweight in-memory counter/histogram/gauge, snapshot at `GET /api/v1/metrics` as JSON.
Wire to Prometheus/Datadog by exporting the snapshot.

## OpenTelemetry (`src/telemetry/integrations.ts`)
If `OTEL_EXPORTER_OTLP_ENDPOINT` is set, traces are exported; otherwise no-op.

## Observability (`src/telemetry/observability.ts`)
Helpers for tracing provider calls and tool execution spans.

## Event correlation
Every request is assigned a `x-request-id` (in `middleware/request-id.ts`) and that id is attached to all logs and metrics emitted during the request lifecycle.
