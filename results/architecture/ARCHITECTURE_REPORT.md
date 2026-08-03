# Architecture Report

## Current Architecture

```mermaid
flowchart LR
  Dashboard[Dashboard / Next.js] --> API[Backend / Hono API]
  Desktop[Desktop / Electron] --> IPC[Preload + IPC]
  IPC --> APIBridge[API Bridge]
  APIBridge --> API
  CLI[CLI] --> API
  Mobile[Mobile / Expo] --> API
  VSCode[VS Code Extension] --> API
  API --> Middleware[Middleware]
  Middleware --> Mounted[Mounted Routers]
  API --> ServiceProvider[Service Provider]
  ServiceProvider --> Firebase[(Firebase)]
  ServiceProvider --> Redis[(Redis)]
  ServiceProvider --> Providers[Provider Platform]
```

## Intended-but-not-fully-connected Architecture

```mermaid
flowchart TB
  API --> ToolsRouter[tools.routes.ts - not mounted]
  API --> WorkspaceEngineRouter[workspace.routes.ts - not mounted]
  API --> OrchestratorRouter[orchestrator.routes.ts - not mounted]
  API --> MarketplaceRouter[marketplace.routes.ts - not mounted]
  API --> ExtensionsRouter[extensions.routes.ts - not mounted]
  API --> KnowledgeRouter[knowledge.routes.ts - not mounted]
  API --> RuntimeRouter[runtime.routes.ts - not mounted]
  ToolsRouter --> ToolRegistry[Tool Registry - dependency absent in ServiceProvider]
  WorkspaceEngineRouter --> FileService[Workspace File Service - dependency absent]
  WorkspaceEngineRouter --> Indexer[Workspace Indexer - currently syntax-broken]
  OrchestratorRouter --> Planner[Planner/Execution/Checkpoint services]
```

## Architectural Risks

1. Multiple client API implementations duplicate endpoint strings instead of importing one generated SDK.
2. Backend feature modules are file-present but not composition-root-present.
3. Tool/workspace/orchestrator route dependencies are not created in `ServiceProvider`.
4. Auth mode differs by client family.
5. Eventing, queues, schedulers and workers are not part of app lifecycle.

## Recommended Target Architecture

```mermaid
flowchart LR
  OpenAPI[Generated OpenAPI Contract] --> SDK[Shared Typed SDK]
  SDK --> Dashboard
  SDK --> Desktop
  SDK --> CLI
  SDK --> Mobile
  SDK --> VSCode
  Backend[Backend Composition Root] --> Routes[All Mounted Routers]
  Backend --> Engines[Workspace/Tools/Orchestrator/Marketplace Engines]
  Backend --> Infra[Redis/Firebase/Queues/Telemetry]
  ContractTests[Contract Tests] --> OpenAPI
  ContractTests --> Routes
  ContractTests --> SDK
```
