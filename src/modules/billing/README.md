# billing

**Purpose:** Billing plans and subscription lifecycle.

## Files

| File | Responsibility |
|------|----------------|
| `billing.service.ts` | Business-logic service. |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
