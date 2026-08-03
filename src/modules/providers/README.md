# providers

**Purpose:** AI provider framework and resilience primitives.

## Subdirectories

| Path | Purpose |
|------|---------|
| [implementations/](implementations/) | Concrete AI providers (OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama). |
| [resilience/](resilience/) | Circuit breaker, load balancer, request queue. |

## Files

| File | Responsibility |
|------|----------------|
| `base-provider.ts` | Provider implementation. |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `provider-factory.ts` | — |
| `provider-registry.ts` | — |
| `provider-router.ts` | — |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
