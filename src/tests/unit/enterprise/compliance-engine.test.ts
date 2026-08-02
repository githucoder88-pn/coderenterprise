/**
 * Compliance Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceEngine } from '../../../enterprise/compliance/compliance-engine.js';
import { createMockLogger } from '../../helpers.js';

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => { engine = new ComplianceEngine(createMockLogger()); });

  describe('createPolicy', () => {
    it('should create a compliance policy', () => {
      const policy = engine.createPolicy('org-1', 'soc2', 'SOC 2 Controls', [
        { id: 'c1', control: 'CC6.1', description: 'Encryption at rest', requirement: 'All data encrypted', status: 'compliant', evidence: [], lastCheckedAt: null },
        { id: 'c2', control: 'CC6.2', description: 'Access controls', requirement: 'RBAC implemented', status: 'non_compliant', evidence: [], lastCheckedAt: null },
      ]);
      expect(policy.framework).toBe('soc2');
      expect(policy.rules.length).toBe(2);
    });
  });

  describe('evaluate', () => {
    it('should evaluate compliance status', async () => {
      engine.createPolicy('org-1', 'soc2', 'SOC 2', [
        { id: 'c1', control: 'A', description: '', requirement: '', status: 'compliant', evidence: [], lastCheckedAt: null },
        { id: 'c2', control: 'B', description: '', requirement: '', status: 'compliant', evidence: [], lastCheckedAt: null },
      ]);

      const result = await engine.evaluate('org-1');
      expect(result.overall).toBe('compliant');
      expect(result.byFramework['soc2']!.compliant).toBe(2);
    });

    it('should report non-compliant', async () => {
      engine.createPolicy('org-1', 'gdpr', 'GDPR', [
        { id: 'c1', control: 'Art5', description: '', requirement: '', status: 'compliant', evidence: [], lastCheckedAt: null },
        { id: 'c2', control: 'Art17', description: '', requirement: '', status: 'non_compliant', evidence: [], lastCheckedAt: null },
      ]);

      const result = await engine.evaluate('org-1');
      expect(result.overall).toBe('non_compliant');
    });
  });

  describe('updateRuleStatus', () => {
    it('should update rule status', () => {
      const policy = engine.createPolicy('org-1', 'soc2', 'SOC 2', [
        { id: 'c1', control: 'A', description: '', requirement: '', status: 'pending', evidence: [], lastCheckedAt: null },
      ]);
      engine.updateRuleStatus(policy.id, 'c1', 'compliant', ['evidence.pdf']);
      const updated = engine.getPolicy(policy.id)!;
      expect(updated.rules[0]!.status).toBe('compliant');
      expect(updated.rules[0]!.evidence).toContain('evidence.pdf');
    });
  });

  describe('getAuditReport', () => {
    it('should generate audit report', async () => {
      engine.createPolicy('org-1', 'soc2', 'SOC 2', [
        { id: 'c1', control: 'A', description: '', requirement: '', status: 'compliant', evidence: [], lastCheckedAt: null },
      ]);
      engine.createPolicy('org-1', 'gdpr', 'GDPR', [
        { id: 'c2', control: 'B', description: '', requirement: '', status: 'non_compliant', evidence: [], lastCheckedAt: null },
      ]);

      const report = await engine.getAuditReport('org-1');
      expect(report.frameworks.length).toBe(2);
      expect(report.frameworks.find((f) => f.name === 'soc2')!.compliance).toBe(100);
      expect(report.frameworks.find((f) => f.name === 'gdpr')!.compliance).toBe(0);
    });
  });
});
