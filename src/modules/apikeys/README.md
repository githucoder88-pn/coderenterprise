# apikeys

**Purpose:** API key CRUD and scope enforcement.

## Files

| File | Responsibility |
|------|----------------|
| `apikey.repository.ts` | Data access / persistence layer. |
| `apikey.service.ts` | Business-logic service. |
| `apikey.types.ts` | Type definitions. |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
