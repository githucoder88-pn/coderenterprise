# Missing Integrations

This report distinguishes source presence from verified connectivity.

| ID | Severity | Missing or unverified integration | Evidence |
|---|---|---|---|
| AUD-004 | High | BullMQ queues/workers, processors, retries, and dead-letter handling | `src/queues/worker.ts:22-30` is commented out |
| AUD-007 | High | API exposure for existing tools, orchestrator, intelligence, knowledge, extensions, marketplace, cluster, runtime, and simulation routes | route files exist but are absent from `src/api/index.ts` |
| AUD-011 | High | Payment processor integration | `src/modules/payments/payment.service.ts` exists; no Stripe/PayPal SDK or provider is configured |
| AUD-012 | High | Real OpenTelemetry/Sentry exporters | `src/telemetry/integrations.ts` logs initialization and generates IDs but imports no exporter SDK |
| AUD-013 | Medium | Push/email notification delivery | `NotificationService` exists, but no provider credentials or delivery worker is configured |
| AUD-014 | Medium | Client E2E connectivity | client packages have API clients, but no Playwright config or environment-backed smoke test |
| AUD-015 | Medium | Firebase startup verification | clients are constructed in `createApp`; only Redis has an explicit startup connect |
| AUD-016 | Medium | Event delivery durability | in-process event bus exists; durable queue, retry, and dead-letter path are not wired |

## Verification notes

Provider adapters, Firebase adapters, Redis cache, route middleware, and client API wrappers are implemented. Their presence should not be interpreted as successful external integration because no CI-backed integration environment or end-to-end test proves credentials, streaming, retries, authorization, or shutdown behavior.

## Required integration matrix

For each client and backend capability, add a row covering endpoint, auth mechanism, request/response schema, streaming transport, timeout/retry policy, telemetry event, failure behavior, and an automated test environment.
