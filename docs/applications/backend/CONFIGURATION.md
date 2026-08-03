# Configuration

All configuration is validated with Zod at boot in `src/config/index.ts`. Missing
or invalid values cause the process to exit with a descriptive error.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development`/`production`/`test` |
| `PORT` | `3000` | HTTP listener port |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` (`debug` in dev) | Pino log level |
| `API_PREFIX` | `/api/v1` | URL prefix for REST routes |
| `FIREBASE_PROJECT_ID` | **required** | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | – | Service account email |
| `FIREBASE_PRIVATE_KEY` | – | Service account PEM (escape newlines as `\n`) |
| `FIREBASE_STORAGE_BUCKET` | – | Bucket name for uploads |
| `FIREBASE_API_KEY` | – | Web API key (for token verification) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | – | Redis AUTH |
| `REDIS_DB` | `0` | Redis DB index |
| `REDIS_KEY_PREFIX` | `ce:` | Key prefix |
| `JWT_SECRET` | **required** (min 32 chars) | HMAC key for access tokens |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh TTL |
| `JWT_ISSUER` | `coderenterprise` | Token issuer claim |
| `ENCRYPTION_KEY` | **required** (32 bytes) | AES-256-GCM key for secrets |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max per window per key |
| `CORS_ORIGINS` | `http://localhost:3000,…` | Comma-separated list |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | – | OpenTelemetry endpoint (optional) |
| `OTEL_SERVICE_NAME` | `coderenterprise-backend` | OTel service name |
| `DEFAULT_PROVIDER` | `openai` | Default AI provider |
| `OPENAI_API_KEY` | – | OpenAI key |
| `ANTHROPIC_API_KEY` | – | Anthropic key |
| `GEMINI_API_KEY` | – | Gemini key |
| `OPENROUTER_API_KEY` | – | OpenRouter key |
| `GROQ_API_KEY` | – | Groq key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |

## Config object shape

`loadConfig()` returns `AppConfig`, grouped into:
`node`, `api`, `firebase`, `redis`, `jwt`, `rateLimit`, `encryption`,
`cors`, `logging`, `health`, `providers`, `billing`, `storage`.

## Emulator support
Set `FIREBASE_USE_EMULATOR=true` and (optionally) emulator host/port variables to
connect to Firebase Local Emulator Suite for development.
