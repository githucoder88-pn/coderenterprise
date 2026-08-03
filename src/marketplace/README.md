# marketplace

**Purpose:** Extension marketplace services.

## Subdirectories

| Path | Purpose |
|------|---------|
| [installers/](installers/) |  |
| [moderation/](moderation/) |  |
| [publishers/](publishers/) |  |
| [ratings/](ratings/) |  |
| [registry/](registry/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
