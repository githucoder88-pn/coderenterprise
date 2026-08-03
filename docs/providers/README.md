# Providers

AI providers implement `BaseProvider` (`src/modules/providers/base-provider.ts`) and are wired through a resilience stack.

## Providers bundled
| Provider | Module | Key env | Streaming | Vision | Tools | Embeddings |
|----------|--------|---------|-----------|--------|-------|------------|
| OpenAI | `implementations/openai.provider.ts` | `OPENAI_API_KEY` | ✅ | ✅ | ✅ | ✅ |
| Anthropic | `implementations/anthropic.provider.ts` | `ANTHROPIC_API_KEY` | ✅ | ✅ | ✅ | – |
| Gemini | `implementations/gemini.provider.ts` | `GEMINI_API_KEY` | ✅ | ✅ | ✅ | ✅ |
| OpenRouter | `implementations/openrouter.provider.ts` | `OPENROUTER_API_KEY` | ✅ | ✅ | ✅ | – |
| Groq | `implementations/groq.provider.ts` | `GROQ_API_KEY` | ✅ | ✅ | ✅ | – |
| Ollama | `implementations/ollama.provider.ts` | `OLLAMA_BASE_URL` | ✅ | ✅ | ✅ | ✅ |

## Resilience
All calls pass through:
1. **Request queue** (`resilience/request-queue.ts`) with concurrency + priority.
2. **Circuit breaker** (`resilience/circuit-breaker.ts`) closed→open→half-open.
3. **Load balancer** (`resilience/load-balancer.ts`) with multiple strategies.

If a provider fails, the **provider router** (`provider-router.ts`) transparently falls back to another provider with equivalent capabilities.

## Adding a provider
1. Create `src/modules/providers/implementations/<name>.provider.ts` extending `BaseProvider`.
2. Implement `chat()`, `stream()`, and optionally `embed()`, `image()`, `countTokens()`.
3. Register in `implementations/index.ts` and `provider-factory.ts`.
4. Add capability flags in `provider-registry.ts`.
