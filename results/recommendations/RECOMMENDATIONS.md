# Recommendations

## Immediate Stabilization Sprint

1. Fix backend syntax error and make `npm run typecheck` pass.
2. Decide the canonical API route surface and mount all intended routers.
3. Generate OpenAPI and replace duplicated endpoint strings with a shared SDK.
4. Fix chat send/stream route mismatch.
5. Make each package typecheck in CI.
6. Fix critical/high vulnerability findings or document accepted risk.

## Integration Hardening

- Add a route inventory test that fails when route files are not mounted.
- Add a client endpoint contract test that fails when clients call missing routes.
- Add service provider coverage tests that instantiate every route dependency.
- Add app startup smoke tests for backend, dashboard, desktop main/preload, CLI, mobile and VS Code activation.

## Product Completeness

- Hide or feature-flag billing, extensions, marketplace, agent panels, browser/MCP tools and mobile push until backend contracts are mounted and tested.
- Replace placeholders with unavailable states that explain required configuration.
- Document environment variables by app and feature.

## Documentation

- Architecture overview with composition root and route map.
- Auth mode matrix.
- Provider setup guide.
- Workspace/files/indexing operational guide.
- Test and release runbooks.
