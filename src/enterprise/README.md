# enterprise

**Purpose:** Enterprise-only features.

## Subdirectories

| Path | Purpose |
|------|---------|
| [compliance/](compliance/) |  |
| [deployments/](deployments/) |  |
| [organizations/](organizations/) |  |
| [policies/](policies/) |  |
| [security/](security/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
