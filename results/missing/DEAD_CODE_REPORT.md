# Dead Code and Duplicate Implementation Report

Static inspection found no safe basis for deleting code automatically; many apparently unused classes may be intended for future composition. The following are candidates requiring ownership confirmation.

## Candidates

### AUD-023 — Unreachable route implementations
- **Severity:** High
- **Location:** `src/api/routes/tools.routes.ts`, `orchestrator.routes.ts`, `intelligence.routes.ts`, `knowledge.routes.ts`, `extensions.routes.ts`, `marketplace.routes.ts`, `cluster.routes.ts`, `distributed.routes.ts`, `simulation.routes.ts`, `runtime.routes.ts`, `enterprise.routes.ts`
- **Cause:** Route factories exist but are not mounted by `src/api/index.ts`.
- **Affected components:** corresponding backend capabilities.
- **Risk level:** Source appears complete while runtime is unreachable.
- **Required fix:** Mount and test supported routes, or archive/remove intentionally unsupported routes.
- **Dependencies:** Service provider composition and authorization.
- **Estimated effort:** 1–3 days.
- **Suggested implementation:** Generate a route inventory from the central registry and fail CI on unregistered route modules.

### AUD-024 — Duplicate/parallel domain surfaces
- **Severity:** Medium
- **Location:** `src/workspace/` and `src/modules/workspaces/`; `src/conversations/` and `src/modules/conversations/`; `src/analytics/` and `src/modules/analytics/`
- **Cause:** Similar feature names exist in separate application layers.
- **Affected components:** workspace, conversation, and analytics behavior.
- **Risk level:** Fixes can land in one implementation while another is used at runtime.
- **Required fix:** Define bounded-context ownership and deprecate duplicates.
- **Dependencies:** Architecture decision records and route matrix.
- **Estimated effort:** 2–5 days.
- **Suggested implementation:** Trace imports from composition roots, mark canonical implementations, and add deprecation notices before deletion.

### AUD-025 — Placeholder integration code
- **Severity:** High
- **Location:** `src/queues/worker.ts`; telemetry integration classes
- **Cause:** Logging/configuration substitutes for operational implementations.
- **Affected components:** queue processing and telemetry.
- **Risk level:** Silent loss of jobs or observability.
- **Required fix:** Implement or explicitly label as development-only.
- **Dependencies:** deployment requirements.
- **Estimated effort:** 2–4 days.
