/**
 * Publisher Service
 *
 * Manages publisher profiles, verification, and reputation.
 */

import type { Publisher } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IPublisherService {
  create(userId: string, name: string, slug: string, email: string): Promise<Result<Publisher>>;
  getById(id: string): Promise<Publisher | null>;
  getByUserId(userId: string): Promise<Publisher | null>;
  getBySlug(slug: string): Promise<Publisher | null>;
  update(id: string, updates: Partial<Pick<Publisher, 'name' | 'bio' | 'website' | 'avatarUrl'>>): Promise<Result<Publisher>>;
  verify(id: string): Promise<Result<Publisher>>;
  updateStats(id: string, stats: { packageCount?: number; totalDownloads?: number }): Promise<void>;
  search(query: string): Promise<readonly Publisher[]>;
  list(top?: number): Promise<readonly Publisher[]>;
}

export class PublisherService implements IPublisherService {
  private readonly publishers = new Map<string, Publisher>();

  constructor(private readonly logger: ILogger) {}

  async create(userId: string, name: string, slug: string, email: string): Promise<Result<Publisher>> {
    const existing = [...this.publishers.values()].find((p) => p.userId === userId || p.slug === slug);
    if (existing) return { success: false, error: { code: ErrorCode.CONFLICT, message: 'Publisher already exists', timestamp: new Date() } };

    const now = new Date();
    const publisher: Publisher = {
      id: crypto.randomUUID(), userId, name, slug, email,
      avatarUrl: null, bio: '', website: null, verified: false,
      packageCount: 0, totalDownloads: 0, reputation: 0, metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.publishers.set(publisher.id, publisher);
    this.logger.info({ id: publisher.id, name, slug }, 'Publisher created');
    return { success: true, data: publisher };
  }

  async getById(id: string): Promise<Publisher | null> { return this.publishers.get(id) ?? null; }

  async getByUserId(userId: string): Promise<Publisher | null> {
    return [...this.publishers.values()].find((p) => p.userId === userId) ?? null;
  }

  async getBySlug(slug: string): Promise<Publisher | null> {
    return [...this.publishers.values()].find((p) => p.slug === slug) ?? null;
  }

  async update(id: string, updates: Partial<Pick<Publisher, 'name' | 'bio' | 'website' | 'avatarUrl'>>): Promise<Result<Publisher>> {
    const pub = this.publishers.get(id);
    if (!pub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Publisher not found', timestamp: new Date() } };
    const updated = { ...pub, ...updates, updatedAt: new Date() };
    this.publishers.set(id, updated);
    return { success: true, data: updated };
  }

  async verify(id: string): Promise<Result<Publisher>> {
    const pub = this.publishers.get(id);
    if (!pub) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Publisher not found', timestamp: new Date() } };
    const updated = { ...pub, verified: true, updatedAt: new Date() };
    this.publishers.set(id, updated);
    this.logger.info({ id }, 'Publisher verified');
    return { success: true, data: updated };
  }

  async updateStats(id: string, stats: { packageCount?: number; totalDownloads?: number }): Promise<void> {
    const pub = this.publishers.get(id);
    if (!pub) return;
    this.publishers.set(id, {
      ...pub,
      packageCount: stats.packageCount ?? pub.packageCount,
      totalDownloads: stats.totalDownloads ?? pub.totalDownloads,
      updatedAt: new Date(),
    });
  }

  async search(query: string): Promise<readonly Publisher[]> {
    const q = query.toLowerCase();
    return [...this.publishers.values()].filter((p) =>
      p.name.toLowerCase().includes(q) || p.slug.includes(q),
    );
  }

  async list(top = 50): Promise<readonly Publisher[]> {
    return [...this.publishers.values()]
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, top);
  }
}
