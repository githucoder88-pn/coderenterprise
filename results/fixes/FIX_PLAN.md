# Fix Plan

## Phase 0: Stop the Bleeding

| Task | Issues | Owner profile | Exit criteria |
|---|---|---|---|
| Fix `WorkspaceIndexer` syntax | CODER-AUDIT-001 | Backend engineer | Root typecheck/build proceed past parser |
| Add route inventory test | CODER-AUDIT-002 | Backend/QA | Every route file is either mounted or explicitly deprecated |
| Add client endpoint inventory test | CODER-AUDIT-003 | Full-stack/QA | No client calls an absent backend endpoint |

## Phase 1: Restore Core Product Flows

1. Mount `/tools` and `/workspace` routers with real existing services.
2. Restore `/conversations/:id/send` and `/send/stream` through the existing conversation engine/orchestrator.
3. Normalize auth handling for dashboard/mobile/desktop/CLI/VS Code.
4. Fix dashboard, CLI, mobile and VS Code typecheck failures.
5. Stabilize backend tests and remove OOM.

## Phase 2: Production Readiness

1. Wire queues/workers/schedulers and shutdown lifecycle.
2. Mount or remove/feature-flag marketplace/extensions/orchestrator/knowledge/runtime/simulation routes.
3. Add integration tests with Redis/Firebase emulator.
4. Add dependency audit gates.
5. Add desktop packaged smoke tests.

## Phase 3: Documentation and Operations

1. Generate OpenAPI docs and publish SDK.
2. Write environment variable and deployment docs.
3. Add runbooks for provider setup, indexing, recovery and incident response.
4. Add architecture diagrams to onboarding docs.

## Suggested Implementation Pattern

```ts
// Example route contract test direction
const mountedRoutes = collectMountedRoutes(createApiRouter(...));
const clientRoutes = collectClientEndpointStrings(['dashboard', 'desktop', 'cli', 'mobile', 'vscode']);
expect(clientRoutes.missingFrom(mountedRoutes)).toEqual([]);
```
