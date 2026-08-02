/**
 * Moderation Service
 *
 * Package review queue, security scanning, approval workflow.
 */

import type { ModerationAction, Package, SecurityScanResult } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IModerationService {
  submitForReview(packageId: string): Promise<Result<void>>;
  approve(packageId: string, moderatorId: string, notes?: string): Promise<Result<ModerationAction>>;
  reject(packageId: string, moderatorId: string, reason: string): Promise<Result<ModerationAction>>;
  suspend(packageId: string, moderatorId: string, reason: string): Promise<Result<ModerationAction>>;
  restore(packageId: string, moderatorId: string): Promise<Result<ModerationAction>>;
  getQueue(): Promise<readonly Package[]>;
  getHistory(packageId: string): Promise<readonly ModerationAction[]>;
  runSecurityScan(packageId: string, version: string): Promise<Result<SecurityScanResult>>;
  getStats(): Promise<{ pending: number; approved: number; rejected: number; suspended: number }>;
}

export class ModerationService implements IModerationService {
  private readonly queue = new Map<string, Package>();
  private readonly actions = new Map<string, ModerationAction[]>();

  constructor(private readonly logger: ILogger) {}

  async submitForReview(packageId: string): Promise<Result<void>> {
    this.logger.info({ packageId }, 'Package submitted for review');
    return { success: true, data: undefined };
  }

  async approve(packageId: string, moderatorId: string, notes?: string): Promise<Result<ModerationAction>> {
    const action = this.recordAction(packageId, 'approve', notes ?? 'Approved', moderatorId);
    this.queue.delete(packageId);
    this.logger.info({ packageId, moderatorId }, 'Package approved');
    return { success: true, data: action };
  }

  async reject(packageId: string, moderatorId: string, reason: string): Promise<Result<ModerationAction>> {
    const action = this.recordAction(packageId, 'reject', reason, moderatorId);
    this.queue.delete(packageId);
    this.logger.info({ packageId, moderatorId, reason }, 'Package rejected');
    return { success: true, data: action };
  }

  async suspend(packageId: string, moderatorId: string, reason: string): Promise<Result<ModerationAction>> {
    const action = this.recordAction(packageId, 'suspend', reason, moderatorId);
    this.logger.warn({ packageId, moderatorId, reason }, 'Package suspended');
    return { success: true, data: action };
  }

  async restore(packageId: string, moderatorId: string): Promise<Result<ModerationAction>> {
    const action = this.recordAction(packageId, 'restore', 'Restored by moderator', moderatorId);
    this.logger.info({ packageId, moderatorId }, 'Package restored');
    return { success: true, data: action };
  }

  async getQueue(): Promise<readonly Package[]> {
    return [...this.queue.values()];
  }

  async getHistory(packageId: string): Promise<readonly ModerationAction[]> {
    return this.actions.get(packageId) ?? [];
  }

  async runSecurityScan(packageId: string, version: string): Promise<Result<SecurityScanResult>> {
    // In production: run static analysis, dependency audit, permission check
    const result: SecurityScanResult = {
      scannedAt: new Date(),
      passed: true,
      issues: [],
      score: 100,
    };
    this.logger.info({ packageId, version, score: result.score }, 'Security scan completed');
    return { success: true, data: result };
  }

  async getStats(): Promise<{ pending: number; approved: number; rejected: number; suspended: number }> {
    let approved = 0, rejected = 0, suspended = 0;
    for (const actions of this.actions.values()) {
      const latest = actions[actions.length - 1];
      if (latest?.action === 'approve') approved++;
      else if (latest?.action === 'reject') rejected++;
      else if (latest?.action === 'suspend') suspended++;
    }
    return { pending: this.queue.size, approved, rejected, suspended };
  }

  private recordAction(packageId: string, action: ModerationAction['action'], reason: string, moderatorId: string): ModerationAction {
    const now = new Date();
    const modAction: ModerationAction = {
      id: crypto.randomUUID(), packageId, action, reason, moderatorId, metadata: {},
      createdAt: now, updatedAt: now,
    };
    if (!this.actions.has(packageId)) this.actions.set(packageId, []);
    this.actions.get(packageId)!.push(modAction);
    return modAction;
  }
}
