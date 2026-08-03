# conversations

**Purpose:** Conversation persistence.

## Files

| File | Responsibility |
|------|----------------|
| `conversation.repository.ts` | Data access / persistence layer. |
| `conversation.service.ts` | Business-logic service. |
| `conversation.types.ts` | Type definitions. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
