/**
 * Session Manager
 *
 * Manages user sessions with context snapshots, restoration, and expiration.
 */

import type { Session, ContextWindow } from './types.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { ICacheService } from '../../infrastructure/redis/cache.js';

export interface ISessionManager {
  create(userId: string, orgId: string, workspaceId: string, conversationId?: string): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  getByUser(userId: string): Promise<readonly Session[]>;
  updateActivity(sessionId: string): Promise<void>;
  saveContext(sessionId: string, context: ContextWindow): Promise<void>;
  restoreContext(sessionId: string): Promise<ContextWindow | null>;
  close(sessionId: string): Promise<void>;
  closeExpired(): Promise<number>;
  extend(sessionId: string, durationMs: number): Promise<Session>;
  touch(sessionId: string): Promise<void>;
}

export class SessionManager implements ISessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly contextStore = new Map<string, ContextWindow>();
  private readonly defaultTtl = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  async create(
    userId: string, orgId: string, workspaceId: string, conversationId?: string,
  ): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date();
    const session: Session = {
      id, userId, organizationId: orgId, conversationId: conversationId ?? null,
      workspaceId, title: 'New Session', status: 'active', contextSnapshot: null,
      messageCount: 0, totalTokens: 0, lastActivityAt: now,
      expiresAt: new Date(now.getTime() + this.defaultTtl),
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.sessions.set(id, session);
    await this.cache.set(`session:${id}`, session, 86400);
    await this.cache.set(`session:user:${userId}`, id, 86400);

    this.logger.info({ sessionId: id, userId, workspaceId }, 'Session created');
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    // Check memory first, then cache
    let session = this.sessions.get(sessionId);
    if (!session) {
      const cached = await this.cache.get<Session>(`session:${sessionId}`);
      if (cached) {
        session = cached;
        this.sessions.set(sessionId, session);
      }
    }

    if (session && session.status === 'active' && session.expiresAt < new Date()) {
      await this.close(sessionId);
      return null;
    }

    return session ?? null;
  }

  async getByUser(userId: string): Promise<readonly Session[]> {
    return [...this.sessions.values()].filter(
      (s) => s.userId === userId && s.status === 'active',
    );
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated = {
      ...session, lastActivityAt: new Date(),
      messageCount: session.messageCount + 1, updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);
    await this.cache.set(`session:${sessionId}`, updated, 86400);
  }

  async saveContext(sessionId: string, context: ContextWindow): Promise<void> {
    this.contextStore.set(sessionId, context);
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, contextSnapshot: context, updatedAt: new Date() });
    }
    this.logger.debug({ sessionId, usedTokens: context.usedTokens }, 'Context saved');
  }

  async restoreContext(sessionId: string): Promise<ContextWindow | null> {
    return this.contextStore.get(sessionId) ?? null;
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.set(sessionId, { ...session, status: 'closed', updatedAt: new Date() });
    this.contextStore.delete(sessionId);
    await this.cache.del(`session:${sessionId}`);

    this.logger.info({ sessionId }, 'Session closed');
  }

  async closeExpired(): Promise<number> {
    let closed = 0;
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (session.status === 'active' && session.expiresAt < now) {
        await this.close(id);
        closed++;
      }
    }
    return closed;
  }

  async extend(sessionId: string, durationMs: number): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const updated = { ...session, expiresAt: new Date(Date.now() + durationMs), updatedAt: new Date() };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async touch(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const updated = { ...session, lastActivityAt: new Date(), updatedAt: new Date() };
    this.sessions.set(sessionId, updated);
  }
}
