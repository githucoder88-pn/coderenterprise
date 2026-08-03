# Testing

All packages use **Vitest** for unit tests. End-to-end tests use **Playwright** where available (backend, dashboard, desktop).

## Running tests
```bash
# Backend (root)
npm test
npm run test:watch
npm run test:coverage

# Clients
cd dashboard && npm test
cd desktop && npm test
cd packages/cli && npm test
cd packages/vscode && npm test
cd apps/mobile && npm test
```

## Structure
- Unit tests live next to the code they exercise (`src/tests/unit/<subsystem>/<name>.test.ts` on backend, `tests/unit/` in clients).
- Fakes and helpers: `src/tests/setup.ts`, `src/tests/helpers.ts`.
- Tests use fake timers for resilience/circuit-breaker determinism.
- Hono routes are tested with `app.request()` without starting an HTTP server.

## Coverage targets
- Services/repositories/resilience/telemetry: ≥ 90%
- Routes/controllers: ≥ 80%
- Utilities/schemas: 100%
- UI components: smoke tests; critical flows covered with Playwright.

## Adding tests
Follow AAA (Arrange, Act, Assert). Prefer pure unit tests; reserve integration tests for
cross-module flows. Mock infrastructure through interfaces, not via `jest.mock`-style monkey patching.
