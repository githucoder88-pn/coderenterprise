# orchestrator

**Purpose:** Multi-agent orchestration.

## Subdirectories

| Path | Purpose |
|------|---------|
| [checkpoints/](checkpoints/) | Checkpoint save/restore. |
| [execution/](execution/) | Execution engine / DAG runner. |
| [planner/](planner/) | Task planner. |
| [registry/](registry/) | Agent type registry. |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
