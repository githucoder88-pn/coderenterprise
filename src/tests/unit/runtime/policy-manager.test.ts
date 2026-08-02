/**
 * Policy Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyManager } from '../../../runtime/policies/runtime-policies.js';
import { createMockLogger } from '../../helpers.js';

describe('PolicyManager', () => {
  let policies: PolicyManager;

  beforeEach(() => { policies = new PolicyManager(createMockLogger()); });

  describe('evaluate', () => {
    it('should allow filesystem reads by default', () => {
      const result = policies.evaluate('filesystem', 'read', '/src/index.ts');
      expect(result.allowed).toBe(true);
    });

    it('should require approval for filesystem writes', () => {
      const result = policies.evaluate('filesystem', 'write', '/src/index.ts');
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow provider complete', () => {
      const result = policies.evaluate('provider', 'complete', 'openai/gpt-4o');
      expect(result.allowed).toBe(true);
    });

    it('should deny secret export', () => {
      const result = policies.evaluate('security', 'export', 'secrets');
      expect(result.allowed).toBe(false);
    });

    it('should require approval for production deploy', () => {
      const result = policies.evaluate('deployment', 'deploy', 'production');
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow staging deploy', () => {
      const result = policies.evaluate('deployment', 'deploy', 'staging');
      expect(result.allowed).toBe(true);
    });
  });

  describe('custom policies', () => {
    it('should add and evaluate custom policy', () => {
      policies.addPolicy({
        domain: 'network', name: 'Block External', enabled: true,
        rules: [{ effect: 'deny', action: 'request', resource: 'external.*', conditions: null }],
      });
      const result = policies.evaluate('network', 'request', 'external.api.com');
      expect(result.allowed).toBe(false);
    });

    it('should disable a policy', () => {
      const policy = policies.addPolicy({
        domain: 'filesystem', name: 'Custom', enabled: true,
        rules: [{ effect: 'deny', action: 'read', resource: '*', conditions: null }],
      });
      policies.disablePolicy(policy.id);
      const result = policies.evaluate('filesystem', 'read', '/test');
      expect(result.allowed).toBe(true); // Default allow for reads
    });
  });

  describe('getPolicies', () => {
    it('should return default policies', () => {
      expect(policies.getPolicies().length).toBeGreaterThan(0);
    });

    it('should filter by domain', () => {
      expect(policies.getPolicies('filesystem').length).toBeGreaterThan(0);
      expect(policies.getPolicies('filesystem').every((p) => p.domain === 'filesystem')).toBe(true);
    });
  });
});
