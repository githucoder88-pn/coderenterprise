# workspaces

**Purpose:** Workspace metadata records.

## Files

| File | Responsibility |
|------|----------------|
| `workspace.repository.ts` | Data access / persistence layer. |
| `workspace.service.ts` | Business-logic service. |
| `workspace.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
