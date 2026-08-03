# runtime

**Purpose:** Runtime approvals/memory/policies.

## Subdirectories

| Path | Purpose |
|------|---------|
| [approvals/](approvals/) |  |
| [memory/](memory/) |  |
| [orchestrator/](orchestrator/) |  |
| [policies/](policies/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
