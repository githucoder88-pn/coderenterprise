# workspace

**Purpose:** Repository/workspace services.

## Subdirectories

| Path | Purpose |
|------|---------|
| [diff/](diff/) |  |
| [editors/](editors/) |  |
| [embeddings/](embeddings/) |  |
| [files/](files/) |  |
| [indexing/](indexing/) |  |
| [patches/](patches/) |  |
| [search/](search/) | Search engines. |
| [snapshots/](snapshots/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
