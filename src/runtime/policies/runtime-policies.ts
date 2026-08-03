/**
 * Runtime Policy Manager
 *
 * Enforces policies for filesystem, network, provider, billing, security, and deployment operations.
 */

import type { RuntimePolicy, PolicyDomain, PolicyRule } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

interface PolicyEvaluation {
  readonly allowed: boolean;
  readonly requiresApproval: boolean;
  readonly reason: string;
  readonly matchedRule: PolicyRule | null;
}

export interface IPolicyManager {
  addPolicy(policy: Omit<RuntimePolicy, 'id' | 'createdAt' | 'updatedAt'>): RuntimePolicy;
  removePolicy(id: string): void;
  evaluate(domain: PolicyDomain, action: string, resource: string, context?: Record<string, unknown>): PolicyEvaluation;
  getPolicies(domain?: PolicyDomain): readonly RuntimePolicy[];
  enablePolicy(id: string): void;
  disablePolicy(id: string): void;
}

export class PolicyManager implements IPolicyManager {
  private readonly policies = new Map<string, RuntimePolicy>();

  constructor(_logger: ILogger) {
    this.initDefaultPolicies();
  }

  addPolicy(input: Omit<RuntimePolicy, 'id' | 'createdAt' | 'updatedAt'>): RuntimePolicy {
    const now = new Date();
    const policy: RuntimePolicy = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.policies.set(policy.id, policy);
    return policy;
  }

  removePolicy(id: string): void { this.policies.delete(id); }

  evaluate(domain: PolicyDomain, action: string, resource: string, _context?: Record<string, unknown>): PolicyEvaluation {
    const domainPolicies = [...this.policies.values()]
      .filter((p) => p.domain === domain && p.enabled)
      .sort((a, b) => {
        // Prioritize deny rules, then by specificity (more rules first)
        const aDeny = a.rules.some((r) => r.effect === 'deny');
        const bDeny = b.rules.some((r) => r.effect === 'deny');
        if (aDeny && !bDeny) return -1;
        if (!aDeny && bDeny) return 1;
        return b.rules.length - a.rules.length;
      }); // Deny-first, then more specific

    for (const policy of domainPolicies) {
      for (const rule of policy.rules) {
        if (this.matchesRule(rule, action, resource)) {
          return {
            allowed: rule.effect === 'allow',
            requiresApproval: rule.effect === 'require_approval',
            reason: `${rule.effect} by policy '${policy.name}'`,
            matchedRule: rule,
          };
        }
      }
    }

    // Default: allow reads, require approval for writes
    const isRead = ['read', 'get', 'list', 'search', 'view'].some((a) => action.toLowerCase().includes(a));
    return {
      allowed: isRead,
      requiresApproval: !isRead,
      reason: isRead ? 'Default: read allowed' : 'Default: write requires approval',
      matchedRule: null,
    };
  }

  getPolicies(domain?: PolicyDomain): readonly RuntimePolicy[] {
    const all = [...this.policies.values()];
    return domain ? all.filter((p) => p.domain === domain) : all;
  }

  enablePolicy(id: string): void {
    const p = this.policies.get(id);
    if (p) this.policies.set(id, { ...p, enabled: true, updatedAt: new Date() });
  }

  disablePolicy(id: string): void {
    const p = this.policies.get(id);
    if (p) this.policies.set(id, { ...p, enabled: false, updatedAt: new Date() });
  }

  private matchesRule(rule: PolicyRule, action: string, resource: string): boolean {
    const actionMatch = rule.action === '*' || action.toLowerCase().includes(rule.action.toLowerCase());
    const resourceMatch = rule.resource === '*' || resource.toLowerCase().includes(rule.resource.toLowerCase()) || new RegExp(rule.resource.replace(/\*/g, '.*')).test(resource);
    return actionMatch && resourceMatch;
  }

  private initDefaultPolicies(): void {
    const now = new Date();
    const defaults: Omit<RuntimePolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { domain: 'filesystem', name: 'FS Read', rules: [{ effect: 'allow', action: 'read', resource: '*', conditions: null }], enabled: true },
      { domain: 'filesystem', name: 'FS Write', rules: [{ effect: 'require_approval', action: 'write', resource: '*', conditions: null }, { effect: 'require_approval', action: 'delete', resource: '*', conditions: null }], enabled: true },
      { domain: 'network', name: 'Network Access', rules: [{ effect: 'allow', action: 'request', resource: 'api.*', conditions: null }, { effect: 'require_approval', action: 'request', resource: '*', conditions: null }], enabled: true },
      { domain: 'provider', name: 'Provider Access', rules: [{ effect: 'allow', action: 'complete', resource: '*', conditions: null }, { effect: 'allow', action: 'stream', resource: '*', conditions: null }], enabled: true },
      { domain: 'billing', name: 'Billing Limits', rules: [{ effect: 'deny', action: 'charge', resource: '*', conditions: { exceeded: true } }, { effect: 'require_approval', action: 'upgrade', resource: '*', conditions: null }], enabled: true },
      { domain: 'security', name: 'Security', rules: [{ effect: 'deny', action: 'export', resource: 'secrets', conditions: null }, { effect: 'require_approval', action: 'rotate', resource: 'keys', conditions: null }], enabled: true },
      { domain: 'deployment', name: 'Deployment', rules: [{ effect: 'require_approval', action: 'deploy', resource: 'production', conditions: null }, { effect: 'allow', action: 'deploy', resource: 'staging', conditions: null }], enabled: true },
    ];

    for (const p of defaults) {
      this.policies.set(crypto.randomUUID(), { ...p, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
    }
  }
}
