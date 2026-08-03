# cluster

**Purpose:** Distributed clustering for horizontal scale-out.

## Subdirectories

| Path | Purpose |
|------|---------|
| [coordinator/](coordinator/) |  |
| [events/](events/) |  |
| [monitoring/](monitoring/) |  |
| [queues/](queues/) |  |
| [registry/](registry/) |  |
| [scaling/](scaling/) |  |
| [scheduler/](scheduler/) |  |
| [workers/](workers/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
