# knowledge

**Purpose:** RAG layer: indexing, memory, retrieval, summarization.

## Subdirectories

| Path | Purpose |
|------|---------|
| [indexing/](indexing/) |  |
| [memory/](memory/) |  |
| [retrieval/](retrieval/) |  |
| [summarization/](summarization/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
