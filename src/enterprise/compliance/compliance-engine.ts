/**
 * Compliance Engine
 *
 * Manages compliance frameworks, rules, and audit evidence.
 */

import type { CompliancePolicy, ComplianceRule, ComplianceFramework } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IComplianceEngine {
  createPolicy(orgId: string, framework: ComplianceFramework, name: string, rules: readonly ComplianceRule[]): CompliancePolicy;
  getPolicy(id: string): CompliancePolicy | null;
  getPolicies(orgId: string): readonly CompliancePolicy[];
  evaluate(orgId: string): Promise<{ overall: 'compliant' | 'non_compliant'; byFramework: Record<string, { compliant: number; nonCompliant: number; total: number }> }>;
  updateRuleStatus(policyId: string, ruleId: string, status: ComplianceRule['status'], evidence?: string[]): Result<void>;
  getAuditReport(orgId: string): Promise<{ frameworks: readonly { name: string; compliance: number; issues: readonly string[] }[] }>;
}

export class ComplianceEngine implements IComplianceEngine {
  private readonly policies = new Map<string, CompliancePolicy>();

  constructor(private readonly logger: ILogger) {}

  createPolicy(orgId: string, framework: ComplianceFramework, name: string, rules: readonly ComplianceRule[]): CompliancePolicy {
    const now = new Date();
    const policy: CompliancePolicy = {
      id: crypto.randomUUID(), organizationId: orgId, framework, name,
      rules, status: 'active', lastAuditAt: null, metadata: {},
      createdAt: now, updatedAt: now,
    };
    this.policies.set(policy.id, policy);
    this.logger.info({ policyId: policy.id, framework, name }, 'Compliance policy created');
    return policy;
  }

  getPolicy(id: string): CompliancePolicy | null { return this.policies.get(id) ?? null; }

  getPolicies(orgId: string): readonly CompliancePolicy[] {
    return [...this.policies.values()].filter((p) => p.organizationId === orgId);
  }

  async evaluate(orgId: string): Promise<{ overall: 'compliant' | 'non_compliant'; byFramework: Record<string, { compliant: number; nonCompliant: number; total: number }> }> {
    const policies = this.getPolicies(orgId);
    const byFramework: Record<string, { compliant: number; nonCompliant: number; total: number }> = {};
    let allCompliant = true;

    for (const policy of policies) {
      const fw = policy.framework;
      if (!byFramework[fw]) byFramework[fw] = { compliant: 0, nonCompliant: 0, total: 0 };

      for (const rule of policy.rules) {
        byFramework[fw]!.total++;
        if (rule.status === 'compliant') {
          byFramework[fw]!.compliant++;
        } else if (rule.status === 'non_compliant') {
          byFramework[fw]!.nonCompliant++;
          allCompliant = false;
        }
      }
    }

    return { overall: allCompliant ? 'compliant' : 'non_compliant', byFramework };
  }

  updateRuleStatus(policyId: string, ruleId: string, status: ComplianceRule['status'], evidence: string[] = []): Result<void> {
    const policy = this.policies.get(policyId);
    if (!policy) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Policy not found', timestamp: new Date() } };

    const rules = policy.rules.map((r) =>
      r.id === ruleId ? { ...r, status, evidence, lastCheckedAt: new Date() } : r,
    );
    this.policies.set(policyId, { ...policy, rules, updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async getAuditReport(orgId: string): Promise<{ frameworks: readonly { name: string; compliance: number; issues: readonly string[] }[] }> {
    const evaluation = await this.evaluate(orgId);
    const frameworks = Object.entries(evaluation.byFramework).map(([name, data]) => ({
      name,
      compliance: data.total > 0 ? (data.compliant / data.total) * 100 : 100,
      issues: data.nonCompliant > 0 ? [`${data.nonCompliant} non-compliant rules`] : [],
    }));
    return { frameworks };
  }
}
