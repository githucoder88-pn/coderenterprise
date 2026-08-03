# webhooks

**Purpose:** Outbound webhook delivery with retries.

## Files

| File | Responsibility |
|------|----------------|
| `webhook.service.ts` | Business-logic service. |
| `webhook.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
