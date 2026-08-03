# Missing Integrations

## Unmounted Backend Routers

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

## Client Endpoints That Depend on Missing Routers

### dashboard

- `/billing-analytics/invoices?${new URLSearchParams(params ?? {})}`
- `/billing-analytics/quotas`
- `/billing-analytics/subscriptions`
- `/conversations/${id}/send`
- `/tools/models/sync`
- `/tools/models?${new URLSearchParams(params ?? {})}`
- `/tools/stats`
- `/tools?category=${category ?? ''}`
- `/workspace/search`
- `/workspaces`
- `/workspaces?${new URLSearchParams(params ?? {})}`

### desktop

- `/conversations/${conversationId}/send`
- `/conversations/${conversationId}/send/stream`
- `/tools${category ? `
- `/tools/${id}/execute`
- `/tools/models`
- `/tools/models/search?q=${encodeURIComponent(query)}`
- `/tools/models/sync`
- `/tools/stats`
- `/workspace/files/read?path=${encodeURIComponent(path)}`
- `/workspace/files/write`
- `/workspace/index`
- `/workspace/search`
- `/workspaces`
- `/workspaces/${id}/files`

### mobile

- `/billing-analytics/invoices`
- `/billing-analytics/subscriptions`
- `/billing-analytics/subscriptions/plans`
- `/billing-analytics/usage`
- `/conversations/${id}/send`
- `/extensions`
- `/orchestrator/agents`
- `/orchestrator/goals`
- `/tools/models/sync`
- `/tools/models?${new URLSearchParams(params ?? {})}`
- `/tools?category=${category ?? ''}`
- `/workspace/index`
- `/workspace/search`
- `/workspaces`

### cli

- `/billing-analytics/subscriptions`
- `/billing-analytics/subscriptions/plans`
- `/billing-analytics/usage`
- `/conversations/${id}/send`
- `/tools/${id}/execute`
- `/tools/models/search?q=${q}`
- `/tools/models/sync`
- `/tools/models?${new URLSearchParams(params ?? {})}`
- `/tools?category=${category ?? ''}`
- `/workspace/index`
- `/workspace/search`
- `/workspaces`

### vscode

- `/billing-analytics/usage`
- `/conversations/${id}/send`
- `/conversations/${id}/send/stream`
- `/tools/${id}/execute`
- `/tools/models/sync`
- `/tools/models?${new URLSearchParams(params ?? {})}`
- `/tools?category=${category ?? ''}`
- `/workspace/files?workspaceId=vscode&recursive=true`
- `/workspace/index`
- `/workspace/search`


## Integration Gaps by Feature

| Feature | Current state | Required integration |
|---|---|---|
| Tools | Tool router exists but is not mounted; clients call `/tools` | Mount router and construct ToolRegistry/DynamicModelRegistry |
| Workspace files/search/index | Engine router exists but is not mounted; indexer syntax broken | Fix indexer, construct FileService/Search/Indexer, mount `/workspace` |
| Chat streaming | Clients call `/send/stream`; mounted router lacks handler | Mount conversation engine or add stream handler |
| Agents/orchestrator | Route files exist but not mounted | Wire planner/execution/checkpoints/recovery services |
| Billing analytics | Clients call `/billing-analytics`; route file unmounted | Mount analytics billing routes or map clients to `/billing` |
| Extensions/marketplace | Backend route files exist; CLI says coming soon; mobile calls `/extensions` | Mount extension/marketplace routers and hide incomplete UX until ready |
| Knowledge/memory | Multiple memory APIs in clients; route exposure inconsistent | Consolidate memory APIs and add contract tests |
| Telemetry/events | Metrics endpoint exists; distributed event bus not started | Wire event bus/queue workers and telemetry spans |
