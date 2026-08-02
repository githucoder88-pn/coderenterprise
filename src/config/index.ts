/**
 * Application Configuration
 *
 * Uses Zod for validated, typed configuration.
 * Single source of truth for all environment variables.
 */

import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────────────

const AppConfigSchema = z.object({
  node: z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    host: z.string().default('0.0.0.0'),
  }),

  api: z.object({
    prefix: z.string().default('/api/v1'),
    version: z.string().default('1.0.0'),
  }),

  firebase: z.object({
    projectId: z.string().min(1),
    clientEmail: z.string().email().optional(),
    privateKey: z.string().optional(),
    storageBucket: z.string().optional(),
    apiKey: z.string().optional(),
    useEmulator: z.coerce.boolean().default(false),
    emulatorHost: z.string().default('localhost'),
    firestoreEmulatorPort: z.coerce.number().int().default(8080),
    authEmulatorPort: z.coerce.number().int().default(9099),
    storageEmulatorPort: z.coerce.number().int().default(9199),
  }),

  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().int().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.coerce.number().int().min(0).max(15).default(0),
    keyPrefix: z.string().default('ce:'),
    maxRetriesPerRequest: z.coerce.number().int().default(3),
    enableReadyCheck: z.boolean().default(true),
    lazyConnect: z.boolean().default(true),
  }),

  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('15m'),
    refreshExpiresIn: z.string().default('7d'),
    issuer: z.string().default('coderenterprise'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  }),

  rateLimit: z.object({
    windowMs: z.coerce.number().int().positive().default(60_000),
    maxRequests: z.coerce.number().int().positive().default(100),
    keyPrefix: z.string().default('rl:'),
  }),

  encryption: z.object({
    key: z.string().min(32),
    algorithm: z.enum(['aes-256-gcm', 'aes-256-cbc']).default('aes-256-gcm'),
  }),

  cors: z.object({
    origins: z
      .string()
      .transform((v) => v.split(',').map((s) => s.trim()))
      .default('http://localhost:3000'),
    credentials: z.boolean().default(true),
  }),

  logging: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.coerce.boolean().default(false),
  }),

  health: z.object({
    path: z.string().default('/health'),
    deep: z.boolean().default(false),
  }),

  telemetry: z.object({
    enabled: z.coerce.boolean().default(false),
    otlpEndpoint: z.string().url().optional(),
    serviceName: z.string().default('coderenterprise-backend'),
    sampleRate: z.coerce.number().min(0).max(1).default(1.0),
  }),
});

// ─── Type ────────────────────────────────────────────────────────────────────

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ─── Loader ──────────────────────────────────────────────────────────────────

let _config: AppConfig | null = null;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  if (_config && !overrides) return _config;

  const raw = {
    node: {
      env: process.env['NODE_ENV'],
      port: process.env['PORT'],
      host: process.env['HOST'],
    },
    api: {
      prefix: process.env['API_PREFIX'],
      version: process.env['npm_package_version'],
    },
    firebase: {
      projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'demo-coderenterprise',
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL'],
      privateKey: process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
      storageBucket: process.env['FIREBASE_STORAGE_BUCKET'],
      apiKey: process.env['FIREBASE_API_KEY'],
      useEmulator: process.env['FIREBASE_USE_EMULATOR'],
      emulatorHost: process.env['FIREBASE_EMULATOR_HOST'],
      firestoreEmulatorPort: process.env['FIRESTORE_EMULATOR_PORT'],
      authEmulatorPort: process.env['FIREBASE_AUTH_EMULATOR_PORT'],
      storageEmulatorPort: process.env['FIREBASE_STORAGE_EMULATOR_PORT'],
    },
    redis: {
      host: process.env['REDIS_HOST'],
      port: process.env['REDIS_PORT'],
      password: process.env['REDIS_PASSWORD'],
      db: process.env['REDIS_DB'],
      keyPrefix: process.env['REDIS_KEY_PREFIX'],
      maxRetriesPerRequest: process.env['REDIS_MAX_RETRIES'],
      enableReadyCheck: process.env['REDIS_ENABLE_READY_CHECK'],
      lazyConnect: process.env['REDIS_LAZY_CONNECT'],
    },
    jwt: {
      secret: process.env['JWT_SECRET'],
      expiresIn: process.env['JWT_EXPIRES_IN'],
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'],
      issuer: process.env['JWT_ISSUER'],
      algorithm: process.env['JWT_ALGORITHM'],
    },
    rateLimit: {
      windowMs: process.env['RATE_LIMIT_WINDOW_MS'],
      maxRequests: process.env['RATE_LIMIT_MAX_REQUESTS'],
      keyPrefix: process.env['RATE_LIMIT_KEY_PREFIX'],
    },
    encryption: {
      key: process.env['ENCRYPTION_KEY'],
      algorithm: process.env['ENCRYPTION_ALGORITHM'],
    },
    cors: {
      origins: process.env['CORS_ORIGINS'],
      credentials: process.env['CORS_CREDENTIALS'],
    },
    logging: {
      level: process.env['LOG_LEVEL'],
      pretty: process.env['LOG_PRETTY'],
    },
    health: {
      path: process.env['HEALTH_CHECK_PATH'],
      deep: process.env['HEALTH_CHECK_DEEP'],
    },
    telemetry: {
      enabled: process.env['OTEL_ENABLED'],
      otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
      serviceName: process.env['OTEL_SERVICE_NAME'],
      sampleRate: process.env['OTEL_SAMPLE_RATE'],
    },
  };

  const merged = overrides
    ? deepMerge(raw, overrides as Record<string, unknown>)
    : raw;

  _config = AppConfigSchema.parse(merged);
  return _config;
}

export function resetConfig(): void {
  _config = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
