# middleware

**Purpose:** Hono middleware: auth, CORS, rate-limit, logging, security headers, error handler.

## Files

| File | Responsibility |
|------|----------------|
| `auth.ts` | — |
| `cors.ts` | — |
| `error-handler.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `rate-limit.ts` | — |
| `request-id.ts` | — |
| `request-logger.ts` | — |
| `security-headers.ts` | — |
| `security.ts` | — |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
