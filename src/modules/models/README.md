# models

**Purpose:** Model registry.

## Files

| File | Responsibility |
|------|----------------|
| `model.repository.ts` | Data access / persistence layer. |
| `model.service.ts` | Business-logic service. |
| `model.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
