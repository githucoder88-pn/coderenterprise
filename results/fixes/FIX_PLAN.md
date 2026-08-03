# Fix Plan

## Phase 0 — Release blockers

| Order | Issue | Action | Exit criterion |
|---|---|---|---|
| 1 | AUD-001 | Correct indexer return types. | `npm run build` passes syntax/type compilation. |
| 2 | AUD-002 | Add ESLint flat config and parser rules. | `npm run lint` runs and reports actionable results. |
| 3 | AUD-003 | Triage all failing tests and un-awaited assertions. | Backend test suite is green and deterministic. |
| 4 | AUD-006 | Select npm or pnpm and normalize lock/install docs. | Clean install reproduces the same graph. |

## Phase 1 — Integration completeness

| Issue | Action | Exit criterion |
|---|---|---|
| AUD-004 | Implement queues, processors, retries, DLQ, and graceful worker shutdown. | Job integration test proves retry and recovery. |
| AUD-007 | Register supported services/routes or remove unsupported routes. | Route inventory test matches public API. |
| AUD-011 | Define payment provider adapter and webhook verification. | Provider contract and replay tests pass. |
| AUD-012 | Connect exporters or document local-only telemetry. | Collector receives traces/errors in integration test. |
| AUD-016 | Add durable event delivery and failure handling. | Retry/DLQ/replay test passes. |

## Phase 2 — Security and client contracts

| Issue | Action | Exit criterion |
|---|---|---|
| AUD-017 | Separate, rotate, revoke, and validate token types. | Cross-token misuse tests fail safely. |
| AUD-018 | Reject placeholder secrets in production. | Startup test rejects unsafe configuration. |
| AUD-019 | Enforce tool sandbox and authorization boundaries. | Adversarial tool suite passes. |
| AUD-014 | Add OpenAPI/client contract and Playwright smoke tests. | Dashboard, desktop, CLI, and extension API flows are exercised. |

## Phase 3 — Operational readiness

Add CI matrix, coverage thresholds for each package, dependency/security gates, Docker smoke tests, load/soak benchmarks, recovery drills, dashboards, runbooks, and rollback documentation. Re-run the complete audit after each phase.
