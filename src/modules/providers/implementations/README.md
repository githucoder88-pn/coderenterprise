# implementations

**Purpose:** Concrete AI providers (OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama).

## Files

| File | Responsibility |
|------|----------------|
| `anthropic.provider.ts` | — |
| `gemini.provider.ts` | — |
| `groq.provider.ts` | — |
| `index.ts` | Barrel file — re-exports public API of this module. |
| `ollama.provider.ts` | — |
| `openai.provider.ts` | — |
| `openrouter.provider.ts` | — |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
