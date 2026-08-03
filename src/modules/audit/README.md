# audit

**Purpose:** Append-only audit log.

## Files

| File | Responsibility |
|------|----------------|
| `audit.repository.ts` | Data access / persistence layer. |
| `audit.service.ts` | Business-logic service. |
| `audit.types.ts` | Type definitions. |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
