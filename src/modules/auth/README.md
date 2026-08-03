# auth

**Purpose:** Authentication service (sign-in/up, token issuance).

## Files

| File | Responsibility |
|------|----------------|
| `auth.service.ts` | Business-logic service. |
| `auth.types.ts` | Type definitions. |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
