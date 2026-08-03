/**
 * Approval Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalManager } from '../../../runtime/approvals/approval-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('ApprovalManager', () => {
  let manager: ApprovalManager;

  beforeEach(() => { manager = new ApprovalManager(createMockLogger()); });

  describe('requestApproval', () => {
    it('should create an approval request', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Deploy to production',
        description: 'Deploying v2.0', riskLevel: 'high', requestedBy: 'agent-1',
      });
      expect(req.status).toBe('pending');
      expect(req.riskLevel).toBe('high');
    });

    it('should auto-approve low risk', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Read file',
        description: 'Reading config', riskLevel: 'low', requestedBy: 'agent-1',
      });
      expect(req.status).toBe('approved');
      expect(req.type).toBe('automatic');
    });
  });

  describe('approve', () => {
    it('should approve a request', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Deploy', description: '', riskLevel: 'high', requestedBy: 'a1',
      });
      const result = manager.approve(req.id, 'admin-1', 'Approved');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('approved');
    });

    it('should reject duplicate approval', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Deploy', description: '', riskLevel: 'high', requestedBy: 'a1',
      });
      manager.approve(req.id, 'admin-1');
      const result = manager.approve(req.id, 'admin-2');
      expect(result.success).toBe(false);
    });
  });

  describe('reject', () => {
    it('should reject a request', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Deploy', description: '', riskLevel: 'high', requestedBy: 'a1',
      });
      const result = manager.reject(req.id, 'admin-1', 'Insufficient testing');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('rejected');
    });
  });

  describe('escalate', () => {
    it('should escalate to critical', () => {
      const req = manager.requestApproval({
        workflowId: 'wf-1', type: 'human', title: 'Deploy', description: '', riskLevel: 'medium', requestedBy: 'a1',
      });
      const result = manager.escalate(req.id);
      expect(result.success).toBe(true);
      expect(result.data!.riskLevel).toBe('critical');
    });
  });

  describe('getPending', () => {
    it('should return pending approvals', () => {
      manager.requestApproval({ workflowId: 'wf-1', type: 'human', title: 'A', description: '', riskLevel: 'high', requestedBy: 'a1' });
      manager.requestApproval({ workflowId: 'wf-1', type: 'human', title: 'B', description: '', riskLevel: 'high', requestedBy: 'a1' });
      manager.approve(manager.getPending()[0]!.id, 'admin');
      expect(manager.getPending().length).toBe(1);
    });
  });

  describe('checkAutoApproval', () => {
    it('should auto-approve low risk', () => {
      expect(manager.checkAutoApproval('low', 'read file')).toBe(true);
    });

    it('should not auto-approve high risk', () => {
      expect(manager.checkAutoApproval('high', 'deploy')).toBe(false);
    });
  });
});
