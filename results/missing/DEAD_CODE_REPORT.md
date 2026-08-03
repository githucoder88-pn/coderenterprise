# Dead Code Report

## Definition

This audit treats code as likely dead or disconnected when it is implemented but not reachable from an application entrypoint, route registry, command registration, or UI flow.

## Likely Dead/Disconnected Backend Route Modules

- `src/api/routes/billing-analytics.routes.ts`
- `src/api/routes/cluster.routes.ts`
- `src/api/routes/conversation-engine.routes.ts`
- `src/api/routes/distributed.routes.ts`
- `src/api/routes/enterprise.routes.ts`
- `src/api/routes/extensions.routes.ts`
- `src/api/routes/intelligence.routes.ts`
- `src/api/routes/knowledge.routes.ts`
- `src/api/routes/marketplace.routes.ts`
- `src/api/routes/orchestrator.routes.ts`
- `src/api/routes/runtime.routes.ts`
- `src/api/routes/simulation.routes.ts`
- `src/api/routes/tools.routes.ts`
- `src/api/routes/workspace.routes.ts`

## Likely Dead/Disconnected Services and Engines

- Workspace engine components under `src/workspace/*` are not reachable from mounted API routes.
- Tool registry/model sync route integration exists under `src/tools/*` but is not mounted.
- Orchestrator/checkpoint/runtime route modules exist but are not mounted.
- Marketplace and extension runtime modules exist but are not mounted into the API router.
- Cluster/distributed queue/event modules exist but are not started by `src/app.ts`.

## Placeholder Markers

Static scan found 29 TODO/FIXME/coming-soon/In-production markers. High-signal examples:

- `packages/cli/src/commands/extensions.ts`: extension marketplace coming soon.
- `src/tools/browser/browser.tool.ts`: production browser automation placeholder.
- `src/tools/mcp/mcp.tool.ts`: production MCP connection placeholder.
- `src/services/security/zero-trust.ts`: production GeoIP placeholder.
- `src/queues/worker.ts`: production queue initialization placeholder.
- `apps/mobile/notifications/service.ts`: production notification permissions/token registration placeholder.

## Duplicate Implementations

API client logic is duplicated in:

- `dashboard/src/lib/api.ts`
- `desktop/electron/services/api-bridge.ts`
- `apps/mobile/services/api.ts`
- `packages/cli/src/services/api.ts`
- `packages/vscode/src/services/api-client.ts`

This duplication is a direct cause of endpoint drift.
