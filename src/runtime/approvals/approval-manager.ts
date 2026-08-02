/**
 * Approval Manager
 *
 * Manages human, automatic, rule-based, and organization approvals.
 */

import type { ApprovalRequest, ApprovalType, ApprovalStatus } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IApprovalManager {
  requestApproval(params: { workflowId: string; taskId?: string; type: ApprovalType; title: string; description: string; riskLevel: ApprovalRequest['riskLevel']; requestedBy: string }): ApprovalRequest;
  approve(id: string, approvedBy: string, reason?: string): Result<ApprovalRequest>;
  reject(id: string, rejectedBy: string, reason: string): Result<ApprovalRequest>;
  escalate(id: string): Result<ApprovalRequest>;
  getPending(userId?: string): readonly ApprovalRequest[];
  getByWorkflow(workflowId: string): readonly ApprovalRequest[];
  getHistory(limit?: number): readonly ApprovalRequest[];
  checkAutoApproval(riskLevel: string, action: string): boolean;
}

export class ApprovalManager implements IApprovalManager {
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly autoApproveRules = new Map<string, { riskLevel: string; action: string }>();

  constructor(private readonly logger: ILogger) {
    // Default auto-approve rules
    this.autoApproveRules.set('low-risk-read', { riskLevel: 'low', action: 'read' });
    this.autoApproveRules.set('low-risk-search', { riskLevel: 'low', action: 'search' });
  }

  requestApproval(params: {
    workflowId: string; taskId?: string; type: ApprovalType;
    title: string; description: string; riskLevel: ApprovalRequest['riskLevel']; requestedBy: string;
  }): ApprovalRequest {
    // Check auto-approval
    if (this.checkAutoApproval(params.riskLevel, params.title)) {
      const now = new Date();
      const request: ApprovalRequest = {
        id: crypto.randomUUID(), workflowId: params.workflowId, taskId: params.taskId,
        type: 'automatic', status: 'approved', title: params.title, description: params.description,
        riskLevel: params.riskLevel, requestedBy: params.requestedBy, approvedBy: 'system',
        reason: 'Auto-approved by policy', expiresAt: new Date(now.getTime() + 3600_000),
        metadata: {}, createdAt: now, updatedAt: now,
      };
      this.requests.set(request.id, request);
      this.logger.info({ id: request.id, title: params.title }, 'Auto-approved');
      return request;
    }

    const now = new Date();
    const request: ApprovalRequest = {
      id: crypto.randomUUID(), workflowId: params.workflowId, taskId: params.taskId,
      type: params.type, status: 'pending', title: params.title, description: params.description,
      riskLevel: params.riskLevel, requestedBy: params.requestedBy, approvedBy: null,
      reason: null, expiresAt: new Date(now.getTime() + 86400_000),
      metadata: {}, createdAt: now, updatedAt: now,
    };

    this.requests.set(request.id, request);
    this.logger.info({ id: request.id, title: params.title, type: params.type, riskLevel: params.riskLevel }, 'Approval requested');
    return request;
  }

  approve(id: string, approvedBy: string, reason?: string): Result<ApprovalRequest> {
    const req = this.requests.get(id);
    if (!req) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Approval request not found', timestamp: new Date() } };
    if (req.status !== 'pending') return { success: false, error: { code: ErrorCode.VALIDATION, message: `Request already ${req.status}`, timestamp: new Date() } };

    const updated = { ...req, status: 'approved' as ApprovalStatus, approvedBy, reason: reason ?? null, updatedAt: new Date() };
    this.requests.set(id, updated);
    this.logger.info({ id, approvedBy }, 'Approval granted');
    return { success: true, data: updated };
  }

  reject(id: string, rejectedBy: string, reason: string): Result<ApprovalRequest> {
    const req = this.requests.get(id);
    if (!req) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Approval request not found', timestamp: new Date() } };
    const updated = { ...req, status: 'rejected' as ApprovalStatus, approvedBy: rejectedBy, reason, updatedAt: new Date() };
    this.requests.set(id, updated);
    this.logger.info({ id, rejectedBy, reason }, 'Approval rejected');
    return { success: true, data: updated };
  }

  escalate(id: string): Result<ApprovalRequest> {
    const req = this.requests.get(id);
    if (!req) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Approval request not found', timestamp: new Date() } };
    const updated = { ...req, status: 'escalated' as ApprovalStatus, riskLevel: 'critical' as const, updatedAt: new Date() };
    this.requests.set(id, updated);
    return { success: true, data: updated };
  }

  getPending(userId?: string): readonly ApprovalRequest[] {
    return [...this.requests.values()].filter((r) => r.status === 'pending');
  }

  getByWorkflow(workflowId: string): readonly ApprovalRequest[] {
    return [...this.requests.values()].filter((r) => r.workflowId === workflowId);
  }

  getHistory(limit = 50): readonly ApprovalRequest[] {
    return [...this.requests.values()]
      .filter((r) => r.status !== 'pending')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  checkAutoApproval(riskLevel: string, action: string): boolean {
    if (riskLevel === 'low') return true;
    for (const rule of this.autoApproveRules.values()) {
      if (rule.riskLevel === riskLevel && action.toLowerCase().includes(rule.action)) return true;
    }
    return false;
  }
}
