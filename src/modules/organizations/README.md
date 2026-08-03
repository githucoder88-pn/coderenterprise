# organizations

**Purpose:** Organization CRUD and membership.

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `organization.repository.ts` | Data access / persistence layer. |
| `organization.service.ts` | Business-logic service. |
| `organization.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
