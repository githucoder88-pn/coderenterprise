# coordinator

**Purpose:** Part of the CODER backend.

## Files

| File | Responsibility |
|------|----------------|
| `agent-scheduler.ts` | — |
| `cluster-manager.ts` | Lifecycle/state manager. |
| `distributed-checkpoints.ts` | — |
| `distributed-memory.ts` | — |
| `health-monitor.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `node-manager.ts` | Lifecycle/state manager. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
