/**
 * Policy Engine
 *
 * Evaluates RBAC, ABAC, and resource policies for authorization decisions.
 */

import type { Policy, PolicyRule } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

interface PolicyContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: string;
  readonly resource: string;
  readonly action: string;
  readonly attributes?: Record<string, unknown>;
  readonly ip?: string;
}

interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly matchedPolicy: string | null;
  readonly matchedRule: PolicyRule | null;
}

export interface IPolicyEngine {
  createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Policy;
  updatePolicy(id: string, updates: Partial<Policy>): Result<Policy>;
  deletePolicy(id: string): void;
  evaluate(context: PolicyContext): PolicyDecision;
  evaluateBatch(contexts: readonly PolicyContext[]): readonly PolicyDecision[];
  getPolicies(orgId: string): readonly Policy[];
  testPolicy(policyId: string, context: PolicyContext): PolicyDecision;
}

export class PolicyEngine implements IPolicyEngine {
  private readonly policies = new Map<string, Policy>();

  constructor(private readonly logger: ILogger) {}

  createPolicy(input: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Policy {
    const now = new Date();
    const policy: Policy = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.policies.set(policy.id, policy);
    this.logger.info({ policyId: policy.id, name: policy.name, type: policy.type }, 'Policy created');
    return policy;
  }

  updatePolicy(id: string, updates: Partial<Policy>): Result<Policy> {
    const policy = this.policies.get(id);
    if (!policy) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Policy not found', timestamp: new Date() } };
    const updated = { ...policy, ...updates, updatedAt: new Date() };
    this.policies.set(id, updated);
    return { success: true, data: updated };
  }

  deletePolicy(id: string): void { this.policies.delete(id); }

  evaluate(context: PolicyContext): PolicyDecision {
    const orgPolicies = [...this.policies.values()]
      .filter((p) => p.organizationId === context.organizationId && p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of orgPolicies) {
      for (const rule of policy.rules) {
        if (this.matchesRule(rule, context)) {
          return {
            allowed: rule.effect === 'allow',
            reason: `${rule.effect} by policy '${policy.name}'`,
            matchedPolicy: policy.id,
            matchedRule: rule,
          };
        }
      }
    }

    // Default deny
    return { allowed: false, reason: 'No matching policy found (default deny)', matchedPolicy: null, matchedRule: null };
  }

  evaluateBatch(contexts: readonly PolicyContext[]): readonly PolicyDecision[] {
    return contexts.map((c) => this.evaluate(c));
  }

  getPolicies(orgId: string): readonly Policy[] {
    return [...this.policies.values()].filter((p) => p.organizationId === orgId);
  }

  testPolicy(policyId: string, context: PolicyContext): PolicyDecision {
    const policy = this.policies.get(policyId);
    if (!policy) return { allowed: false, reason: 'Policy not found', matchedPolicy: null, matchedRule: null };

    for (const rule of policy.rules) {
      if (this.matchesRule(rule, context)) {
        return { allowed: rule.effect === 'allow', reason: `Matched rule in '${policy.name}'`, matchedPolicy: policyId, matchedRule: rule };
      }
    }
    return { allowed: false, reason: 'No matching rule in policy', matchedPolicy: null, matchedRule: null };
  }

  private matchesRule(rule: PolicyRule, context: PolicyContext): boolean {
    // Check principals
    if (rule.principals && rule.principals.length > 0) {
      if (!rule.principals.includes(context.userId) && !rule.principals.includes(context.role) && !rule.principals.includes('*')) {
        return false;
      }
    }

    // Check actions
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
    if (!actions.includes(context.action) && !actions.includes('*')) return false;

    // Check resources
    const resources = Array.isArray(rule.resource) ? rule.resource : [rule.resource];
    if (!resources.some((r) => this.matchesPattern(r, context.resource))) return false;

    // Check conditions (ABAC)
    if (rule.conditions) {
      for (const [key, expected] of Object.entries(rule.conditions)) {
        const actual = context.attributes?.[key] ?? (context as any)[key];
        if (actual !== expected) return false;
      }
    }

    return true;
  }

  private matchesPattern(pattern: string, value: string): boolean {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(value);
    }
    return pattern === value;
  }
}
