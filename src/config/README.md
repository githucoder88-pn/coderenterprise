# config

**Purpose:** Zod-validated environment configuration.

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |

## Public exports

- `AppConfig`
- `loadConfig`
- `resetConfig`

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
