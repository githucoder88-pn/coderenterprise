# resilience

**Purpose:** Circuit breaker, load balancer, request queue.

## Files

| File | Responsibility |
|------|----------------|
| `circuit-breaker.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `load-balancer.ts` | — |
| `request-queue.ts` | Queue logic. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
