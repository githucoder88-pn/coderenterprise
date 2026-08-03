# Testing

## Framework

- **Vitest** for all unit tests (`npm test`).
- **Playwright** for e2e (`npm run test:e2e`).
- Tests live next to the subsystems they exercise in `src/tests/unit/<subsystem>/`.

## Running

```bash
npm test                 # run once
npm run test:watch       # watch mode
npm run test:coverage    # coverage reports under coverage/
npm run test:e2e         # Playwright (requires running app)
```

## Conventions

- Co-locate fakes: `src/tests/setup.ts` and `src/tests/helpers.ts` provide in-memory EventBus, fake repos, fake providers.
- Service tests instantiate services directly with fake infrastructure.
- Route tests use Hono's `app.request()` helper (no live HTTP).
- Each resilience component (circuit breaker, load balancer, rate limiter) has deterministic tests controlling time via Vitest fake timers.

## Coverage goals

- Services/repositories/resilience: > 90%
- Routes/controllers: > 80%
- Utilities/schemas: 100%

## Adding a test

1. Create `<name>.test.ts` in the matching `src/tests/unit/<subsystem>/` directory.
2. Use `describe`/`it`/`expect`; import types from `@core/*` aliases.
3. Prefer pure unit tests over integration tests — reserve integration tests for
   cross-module flows (auth → conversation → provider).
