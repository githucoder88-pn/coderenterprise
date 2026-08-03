/**
 * Redis Client Adapter
 *
 * Wraps ioredis with health checks, metrics, and graceful shutdown.
 */

import Redis, { type ChainableCommander } from 'ioredis';
import type { ILogger } from '../../telemetry/logger.js';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
}

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  incrBy(key: string, amount: number): Promise<number>;
  hset(key: string, field: string, value: string): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string | string[]): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lrem(key: string, count: number, value: string): Promise<number>;
  llen(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, match?: string, count?: number): Promise<[string, string[]]>;
  pipeline(): ChainableCommander;
  healthCheck(): Promise<boolean>;
  disconnect(): Promise<void>;
  getClient(): Redis;
}

export class RedisClientAdapter implements IRedisClient {
  private readonly client: Redis;
  private connected = false;

  constructor(
    private readonly config: RedisConfig,
    private readonly logger: ILogger,
  ) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      lazyConnect: config.lazyConnect,
      retryStrategy(times: number): number | null {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.info('Redis connected');
    });

    this.client.on('error', (err: Error) => {
      this.connected = false;
      this.logger.error({ err }, 'Redis error');
    });

    this.client.on('close', () => {
      this.connected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async connect(): Promise<void> {
    if (!this.config.lazyConnect) return;
    await this.client.connect();
    this.connected = true;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.client.del(...key);
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string | string[]): Promise<number> {
    if (Array.isArray(field)) {
      return this.client.hdel(key, ...field);
    }
    return this.client.hdel(key, field);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async scan(
    cursor: string,
    match?: string,
    count?: number,
  ): Promise<[string, string[]]> {
    const args: (string | number)[] = ['SCAN', cursor];
    if (match) args.push('MATCH', match);
    if (count) args.push('COUNT', count);
    return (await (this.client as any).call(...args)) as [string, string[]];
  }

  pipeline(): ChainableCommander {
    return this.client.pipeline();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client.disconnect();
    this.connected = false;
    this.logger.info('Redis disconnected');
  }

  getClient(): Redis {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
