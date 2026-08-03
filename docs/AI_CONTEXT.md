# AI Context

> **For AI coding agents (Claude, GPT, Cursor, Copilot, etc.).**
> Load this file first. It is a condensed bootstrap for the codebase.

## One-line summary

CODER is a **monorepo** for an enterprise AI coding platform: a Hono+Node backend with six AI providers, a multi-agent orchestrator, a knowledge/workspace engine, and five clients (web dashboard, CLI, Electron desktop, VS Code extension, React Native mobile).

## Primary languages & runtimes

- **TypeScript 5.7** across everything (strict mode).
- Node **22+** backend. pnpm preferred; npm works.
- **No monorepo build tool** — each package has its own `package.json` and scripts.

## Module resolution

- Backend: path aliases in `tsconfig.json`
  - `@core/*` → `src/core/*`
  - `@modules/*` → `src/modules/*`
  - `@providers/*` → `src/providers/*`
  - `@middleware/*` → `src/middleware/*`
  - `@queues/*` → `src/queues/*`
  - `@services/*` → `src/services/*`
  - `@database/*` → `src/database/*`
  - `@telemetry/*` → `src/telemetry/*`
  - `@api/*` → `src/api/*`
  - `@types/*` → `src/types/*`
  - `@config/*` → `src/config/*`
  - `@tests/*` → `src/tests/*`
  - `@infrastructure/*` → `src/infrastructure/*`
  - `@repositories/*` → `src/repositories/*` (no actual folder yet; modules own their repos)
- Mobile: `@/*` → `apps/mobile/*`.
- Other clients: relative imports only.

## Canonical entry points

| Concern | File |
|---------|------|
| Backend HTTP server | `src/index.ts` → `src/app.ts` → `src/api/index.ts` |
| API router mount | `src/api/index.ts` |
| DI container | `src/core/container.ts` |
| Config schema (Zod) | `src/config/index.ts` |
| Hono app factory + middleware | `src/app.ts` |
| Provider registry | `src/modules/providers/provider-registry.ts` |
| Provider router (LB, CB, queue) | `src/modules/providers/provider-router.ts` |
| Orchestrator/agent execution | `src/orchestrator/execution/execution-engine.ts` |
| Conversation + streaming | `src/conversations/engine/streaming-engine.ts`, `src/modules/conversations/conversation.service.ts` |
| Dashboard client API | `dashboard/src/lib/api.ts` |
| Mobile API client | `apps/mobile/services/api.ts` |
| CLI entry | `packages/cli/src/index.ts` |
| VS Code extension | `packages/vscode/src/extension.ts` |
| Electron main | `desktop/electron/main/index.ts` |

## Architectural invariants

1. **No business logic in clients.** Mobile/dashboard/CLI/desktop/VSCode all talk to the same REST+SSE API.
2. **Domain modules are self-contained.** Each module under `src/modules/<x>/` owns its `*.types.ts`, `*.service.ts`, and `*.repository.ts` (when persistence is needed). Don’t import across module internals — import from the module’s `index.ts` or via ServiceProvider.
3. **Result pattern.** Services return `Result<T, AppError>` (`ok()` / `err()` from `src/types`). Never throw across HTTP boundaries; middleware in `src/middleware/error-handler.ts` converts `AppError` to REST responses.
4. **Infrastructure is interface-driven.** Firebase/Redis clients are behind `IAuthClient`, `IRedisClient`, etc. (see `src/infrastructure/*/*-client.ts`). Tests use in-memory fakes.
5. **Streaming is server-sent events.** `streamMessage` on clients reads `data: …\n\n` frames terminated by `data: [DONE]`. New providers must implement a streaming path in `src/modules/providers/implementations/*.ts`.
6. **Event bus is in-process**; cross-process goes through BullMQ queues (`src/queues/worker.ts`). Don’t confuse the two.
7. **Add deps only when truly needed.** The codebase intentionally avoids heavy frameworks — e.g., markdown, syntax highlighting, and bottom sheets on mobile are hand-rolled to keep bundle size minimal.

## Common commands

```bash
npm install
npm run dev              # backend via tsx watch
npm test                 # backend vitest
npm run typecheck

cd dashboard && npm install && npm run dev
cd desktop   && npm install && npm run dev
cd packages/cli    && npm install && npm run dev
cd packages/vscode && npm install && npm run build
cd apps/mobile    && npm install && npx expo start
```

## Naming conventions

- Files: kebab-case except React components (PascalCase).
- Classes: PascalCase. Variables/functions: camelCase. Constants: UPPER_SNAKE_CASE.
- Tests colocated as `<name>.test.ts`. Factory/helper files go in `tests/` closest to their target (e.g., `src/tests/helpers.ts`).
- Zod schemas = `XxxSchema`; inferred type = `Xxx`.

## AI-relevant hotspots

- **Adding a new AI provider** → copy `src/modules/providers/implementations/ollama.provider.ts`, register in `implementations/index.ts` and `provider-factory.ts`.
- **Adding a new tool** → `src/tools/<name>/<name>.tool.ts`, register in `src/tools/registry/tool-registry.ts`.
- **Adding a REST endpoint** → add Hono route in the matching `src/api/routes/*.routes.ts`; add the service method first; return `Result<T, AppError>`.
- **Adding a mobile feature** → add screen under `apps/mobile/app/...`; reuse `@/services/api.ts`, `@/hooks/use-api.ts`, `@/theme/*`, `@/components/common/*`. Do not duplicate API/auth/telemetry logic.
- **Adding a CLI command** → create file in `packages/cli/src/commands/` and register in `packages/cli/src/index.ts`.

## Companion files

Read these next if you need more depth:

- `SYSTEM_OVERVIEW.md` — component inventory & request lifecycle
- `ARCHITECTURE_INDEX.md` — links to all architecture ADR-style docs
- `CODEBASE_MAP.md` — every top-level folder with purpose & owner
- `FILE_RELATIONSHIPS.md` — import graph & data flow
