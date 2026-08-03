# core

**Purpose:** Framework primitives: DI container, event bus, base service/repository classes, Result type.

## Files

| File | Responsibility |
|------|----------------|
| `base-repository.ts` | — |
| `base-service.ts` | — |
| `container.ts` | — |
| `event-bus.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
