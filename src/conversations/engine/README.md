# engine

**Purpose:** Core conversation runtime.

## Files

| File | Responsibility |
|------|----------------|
| `attachment-service.ts` | — |
| `context-engine.ts` | Core engine logic. |
| `conversation-service.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `memory-service.ts` | — |
| `orchestrator.ts` | — |
| `prompt-templates.ts` | — |
| `session-manager.ts` | Lifecycle/state manager. |
| `streaming-engine.ts` | Core engine logic. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
