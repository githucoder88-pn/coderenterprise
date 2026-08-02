/**
 * Redis Provider
 *
 * Creates and manages the Redis client and cache service.
 */

import { RedisClientAdapter, type IRedisClient } from '../infrastructure/redis/redis-client.js';
import { CacheService, type ICacheService } from '../infrastructure/redis/cache.js';
import type { RedisConfig } from '../infrastructure/redis/redis-client.js';
import type { ILogger } from '../telemetry/logger.js';

export interface RedisProvider {
  readonly redis: IRedisClient;
  readonly cache: ICacheService;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export function createRedisProvider(
  config: RedisConfig,
  logger: ILogger,
): RedisProvider {
  const redis = new RedisClientAdapter(config, logger);
  const cache = new CacheService(redis, logger);

  return {
    redis,
    cache,
    async connect() {
      await redis.connect();
    },
    async disconnect() {
      await redis.disconnect();
    },
    async healthCheck() {
      return redis.healthCheck();
    },
  };
}
