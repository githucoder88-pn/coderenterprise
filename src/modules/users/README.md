# users

**Purpose:** User CRUD.

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `user.repository.ts` | Data access / persistence layer. |
| `user.service.ts` | Business-logic service. |
| `user.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
