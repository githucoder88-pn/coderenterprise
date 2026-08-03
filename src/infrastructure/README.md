# infrastructure

**Purpose:** Adapters to external services (Firebase, Redis).

## Subdirectories

| Path | Purpose |
|------|---------|
| [firebase/](firebase/) | Auth, Firestore, Storage wrappers. |
| [redis/](redis/) | Redis client and cache. |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
