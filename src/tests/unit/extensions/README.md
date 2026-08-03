# extensions

**Purpose:** Part of the CODER backend.

## Files

| File | Responsibility |
|------|----------------|
| `dependency-resolver.test.ts` | Unit tests. |
| `extension-lifecycle.test.ts` | Unit tests. |
| `extension-registry.test.ts` | Unit tests. |
| `message-bus.test.ts` | Unit tests. |
| `permission-manager.test.ts` | Unit tests. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
