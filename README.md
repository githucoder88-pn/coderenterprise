# CODER Enterprise Backend

Production-grade, enterprise backend foundation built with Domain-Driven Design.

## Architecture

```
src/
├── core/           # DI container, event bus, base classes
├── modules/        # Domain modules (auth, users, orgs, billing, etc.)
├── infrastructure/ # Firebase, Redis adapters
├── providers/      # Service factories / composition root
├── middleware/      # Auth, rate limiting, error handling, logging
├── queues/         # BullMQ background workers
├── services/       # Cross-cutting services
├── repositories/   # Data access layer
├── database/       # Seeds, migrations
├── telemetry/      # Pino logging, metrics
├── api/            # Route definitions (OpenAPI)
├── types/          # Shared type definitions
├── tests/          # Unit and integration tests
└── config/         # Validated configuration
```

## Tech Stack

| Layer          | Technology              |
|----------------|-------------------------|
| Runtime        | Node.js 22+ / TypeScript 5.x |
| Framework      | Hono                    |
| Database       | Firebase Firestore      |
| Auth           | Firebase Authentication |
| Cache          | Redis (ioredis)         |
| Queue          | BullMQ                  |
| Storage        | Firebase Cloud Storage  |
| Validation     | Zod                     |
| Logging        | Pino                    |
| Testing        | Vitest                  |
| Container      | Docker                  |
| CI             | GitHub Actions          |

## Design Patterns

- **Domain-Driven Design** — Each module encapsulates its own types, repository, and service
- **Repository Pattern** — Abstract data access behind interfaces
- **Service Pattern** — Business logic in service classes extending `BaseService`
- **Dependency Injection** — Lightweight IoC container in `core/container.ts`
- **Event-Driven Architecture** — In-process `EventBus` for domain events
- **CQRS** — Separate read/write paths in services
- **Adapter Pattern** — Infrastructure clients behind interfaces
- **Strategy Pattern** — Swappable caching, billing, and auth strategies
- **Result Pattern** — Type-safe error handling with `Result<T, E>`

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Docker
docker compose up
```

## Configuration

All configuration is validated via Zod. Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

## AI Provider Platform

Six swappable providers with enterprise resilience:

| Provider   | Streaming | Tools | Vision | Embeddings | Image Gen | Reasoning |
|------------|-----------|-------|--------|------------|-----------|-----------|
| OpenAI     | ✅        | ✅    | ✅     | ✅         | ✅        | ✅        |
| Anthropic  | ✅        | ✅    | ✅     | —          | —         | ✅        |
| Gemini     | ✅        | ✅    | ✅     | ✅         | ✅        | ✅        |
| OpenRouter | ✅        | ✅    | ✅     | —          | —         | ✅        |
| Ollama     | ✅        | ✅    | ✅     | ✅         | —         | —         |
| Groq       | ✅        | ✅    | ✅     | —          | —         | —         |

**Resilience patterns:**
- Circuit breaker (closed → open → half-open)
- Request queue with concurrency control and priority
- Load balancing (round-robin, least-latency, weighted-random, priority)
- Automatic fallback across providers
- Exponential backoff with jitter
- Per-provider health checks

**API Endpoints:**

| Method | Path                              | Auth   | Description              |
|--------|-----------------------------------|--------|--------------------------|
| POST   | `/api/v1/auth/sign-in`            | No     | Sign in                  |
| POST   | `/api/v1/auth/sign-up`            | No     | Sign up                  |
| POST   | `/api/v1/auth/sign-out`           | Yes    | Sign out                 |
| GET    | `/api/v1/auth/me`                 | Yes    | Current user session     |
| POST   | `/api/v1/providers/completions`   | Yes    | AI completion            |
| POST   | `/api/v1/providers/completions/stream` | Yes | Streaming completion   |
| POST   | `/api/v1/providers/embeddings`    | Yes    | Generate embeddings      |
| POST   | `/api/v1/providers/images`        | Yes    | Generate images          |
| POST   | `/api/v1/providers/tokens/count`  | Yes    | Count tokens             |
| GET    | `/api/v1/providers`               | Yes    | List providers           |
| GET    | `/api/v1/providers/stats`         | Yes    | Provider stats           |
| GET    | `/api/v1/providers/healthy`       | Yes    | Healthy providers        |
| GET    | `/api/v1/users`                   | Yes    | List users               |
| GET    | `/api/v1/users/:id`               | Yes    | Get user                 |
| POST   | `/api/v1/users`                   | Yes    | Create user              |
| PATCH  | `/api/v1/users/:id`               | Yes    | Update user              |
| DELETE | `/api/v1/users/:id`               | Yes    | Delete user              |
| GET    | `/api/v1/organizations/:id`       | Yes    | Get organization         |
| POST   | `/api/v1/organizations`           | Yes    | Create organization      |
| GET    | `/api/v1/api-keys`                | Yes    | List API keys            |
| POST   | `/api/v1/api-keys`                | Yes    | Create API key           |
| GET    | `/api/v1/audit`                   | Yes    | List audit logs          |
| GET    | `/api/v1/secrets`                 | Yes    | List secrets             |
| POST   | `/api/v1/secrets`                 | Yes    | Create secret            |
| GET    | `/api/v1/billing/plans`           | Yes    | List billing plans       |
| GET    | `/api/v1/analytics/usage`         | Yes    | Get usage metrics        |
| GET    | `/health`                         | No     | Shallow health check     |
| GET    | `/api/v1/health/deep`             | No     | Deep health check        |

## Testing

```bash
npm test              # Run all tests (154 tests, 21 suites)
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## License

Proprietary — CODER Enterprise
