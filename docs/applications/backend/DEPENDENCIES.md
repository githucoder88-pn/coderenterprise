# Backend Dependencies

Production dependencies (from `package.json`):

| Package | Version | Purpose |
|---------|---------|---------|
| `hono` | ^4.6 | Web-standard HTTP framework |
| `@hono/node-server` | ^1.13 | Node adapter for Hono |
| `@hono/zod-openapi` | ^0.18 | OpenAPI + Zod validation for routes |
| `firebase-admin` | ^12.7 | Firestore, Auth, Storage access |
| `ioredis` | ^5.4 | Redis client (cache, queues, pub/sub) |
| `bullmq` | ^5.25 | Distributed job queues |
| `zod` | ^3.23 | Schema validation (config, requests, DTOs) |
| `nanoid` | ^5.0 | Collision-resistant IDs |
| `pino` | ^9.5 | Structured JSON logging |
| `pino-pretty` | ^11.3 | Dev log formatting |
| `rate-limiter-flexible` | ^5.0 | Redis-backed sliding-window rate limits |

Dev: TypeScript 5.7, Vitest 2.1, Playwright, ESLint 9, Prettier, tsx, tsconfig-paths.

## Peer / infrastructure

- Redis 7 (with AOF persistence)
- Firebase project (Auth + Firestore + Storage)
- Node.js 22+
- (Optional) OTel collector at `OTEL_EXPORTER_OTLP_ENDPOINT`
- (Optional) pnpm 9

## Circular-dependency policy

Imports must flow **down** the layer cake:
`api → modules/domain → core/infrastructure`.
Cross-module imports happen only via dependency injection in the composition root.
