# api

**Purpose:** Hono API router that mounts all domain routes and applies middleware.

## Subdirectories

| Path | Purpose |
|------|---------|
| [routes/](routes/) | One Hono router file per domain (auth, conversations, providers, …). |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |

## Public exports

- `createApiRouter`

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
