# tools

**Purpose:** Built-in tools and tool registry.

## Subdirectories

| Path | Purpose |
|------|---------|
| [browser/](browser/) |  |
| [docker/](docker/) |  |
| [filesystem/](filesystem/) |  |
| [git/](git/) |  |
| [mcp/](mcp/) |  |
| [registry/](registry/) |  |
| [search/](search/) |  |
| [shell/](shell/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
