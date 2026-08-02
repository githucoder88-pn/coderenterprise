/**
 * Policy Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../../../enterprise/policies/policy-engine.js';
import { createMockLogger } from '../../helpers.js';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => { engine = new PolicyEngine(createMockLogger()); });

  describe('evaluate', () => {
    it('should allow when policy matches', () => {
      engine.createPolicy({
        organizationId: 'org-1', name: 'Dev Access', description: '', type: 'rbac',
        rules: [{ effect: 'allow', action: 'workspace:create', resource: 'workspace:*', conditions: null, principals: null }],
        enabled: true, priority: 100, metadata: {},
      });

      const decision = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'developer',
        resource: 'workspace:123', action: 'workspace:create',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should deny when no policy matches', () => {
      const decision = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'viewer',
        resource: 'workspace:123', action: 'workspace:delete',
      });
      expect(decision.allowed).toBe(false);
    });

    it('should deny when policy effect is deny', () => {
      engine.createPolicy({
        organizationId: 'org-1', name: 'Deny Delete', description: '', type: 'rbac',
        rules: [{ effect: 'deny', action: 'workspace:delete', resource: 'workspace:*', conditions: null, principals: null }],
        enabled: true, priority: 200, metadata: {},
      });

      const decision = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'admin',
        resource: 'workspace:123', action: 'workspace:delete',
      });
      expect(decision.allowed).toBe(false);
    });

    it('should respect priority ordering', () => {
      engine.createPolicy({
        organizationId: 'org-1', name: 'Low Priority', description: '', type: 'rbac',
        rules: [{ effect: 'deny', action: 'test', resource: '*', conditions: null, principals: null }],
        enabled: true, priority: 10, metadata: {},
      });
      engine.createPolicy({
        organizationId: 'org-1', name: 'High Priority', description: '', type: 'rbac',
        rules: [{ effect: 'allow', action: 'test', resource: '*', conditions: null, principals: null }],
        enabled: true, priority: 100, metadata: {},
      });

      const decision = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'user',
        resource: 'anything', action: 'test',
      });
      expect(decision.allowed).toBe(true); // High priority allow wins
    });

    it('should match wildcard resources', () => {
      engine.createPolicy({
        organizationId: 'org-1', name: 'Wildcard', description: '', type: 'resource',
        rules: [{ effect: 'allow', action: 'read', resource: 'workspace:*', conditions: null, principals: null }],
        enabled: true, priority: 100, metadata: {},
      });

      const decision = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'user',
        resource: 'workspace:abc', action: 'read',
      });
      expect(decision.allowed).toBe(true);
    });

    it('should check conditions (ABAC)', () => {
      engine.createPolicy({
        organizationId: 'org-1', name: 'ABAC', description: '', type: 'abac',
        rules: [{
          effect: 'allow', action: 'deploy', resource: '*',
          conditions: { environment: 'staging' }, principals: null,
        }],
        enabled: true, priority: 100, metadata: {},
      });

      const allowed = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'developer',
        resource: 'deployment', action: 'deploy', attributes: { environment: 'staging' },
      });
      expect(allowed.allowed).toBe(true);

      const denied = engine.evaluate({
        userId: 'u1', organizationId: 'org-1', role: 'developer',
        resource: 'deployment', action: 'deploy', attributes: { environment: 'production' },
      });
      expect(denied.allowed).toBe(false);
    });
  });

  describe('testPolicy', () => {
    it('should test a specific policy', () => {
      const policy = engine.createPolicy({
        organizationId: 'org-1', name: 'Test', description: '', type: 'rbac',
        rules: [{ effect: 'allow', action: 'read', resource: 'docs:*', conditions: null, principals: null }],
        enabled: true, priority: 100, metadata: {},
      });

      const result = engine.testPolicy(policy.id, {
        userId: 'u1', organizationId: 'org-1', role: 'user',
        resource: 'docs:api', action: 'read',
      });
      expect(result.allowed).toBe(true);
    });
  });
});
