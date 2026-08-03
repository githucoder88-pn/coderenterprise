# intelligence

**Purpose:** Higher-order reasoning layers.

## Subdirectories

| Path | Purpose |
|------|---------|
| [coordination/](coordination/) |  |
| [evaluation/](evaluation/) |  |
| [optimization/](optimization/) |  |
| [planning/](planning/) |  |
| [reasoning/](reasoning/) |  |
| [reflection/](reflection/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
