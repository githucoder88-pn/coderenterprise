# extensions

**Purpose:** Runtime extension framework.

## Subdirectories

| Path | Purpose |
|------|---------|
| [dependencies/](dependencies/) |  |
| [lifecycle/](lifecycle/) |  |
| [marketplace/](marketplace/) |  |
| [messaging/](messaging/) |  |
| [permissions/](permissions/) |  |
| [registry/](registry/) |  |
| [runtime/](runtime/) |  |
| [sandbox/](sandbox/) |  |
| [storage/](storage/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
