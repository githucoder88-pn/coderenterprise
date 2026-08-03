# services

**Purpose:** Cross-cutting services.

## Subdirectories

| Path | Purpose |
|------|---------|
| [security/](security/) | CSRF, XSS, encryption, rate-limiter, zero-trust. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
