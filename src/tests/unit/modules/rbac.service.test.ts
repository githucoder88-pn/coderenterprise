/**
 * RBAC Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RBACService } from '../../../modules/rbac/rbac.service.js';
import { createMockLogger, createMockEventBus } from '../../helpers.js';
import { ErrorCode } from '../../../types/index.js';

describe('RBACService', () => {
  let service: RBACService;

  beforeEach(() => {
    service = new RBACService(createMockLogger(), createMockEventBus());
  });

  describe('getPermissionsForRole', () => {
    it('should return admin:all for owner role', () => {
      const perms = service.getPermissionsForRole('owner');
      expect(perms).toContain('admin:all');
    });

    it('should return full permissions for admin role', () => {
      const perms = service.getPermissionsForRole('admin');
      expect(perms).toContain('users:read');
      expect(perms).toContain('users:write');
      expect(perms).toContain('organizations:manage_members');
      expect(perms).not.toContain('admin:all');
    });

    it('should return limited permissions for member role', () => {
      const perms = service.getPermissionsForRole('member');
      expect(perms).toContain('users:read');
      expect(perms).not.toContain('users:delete');
      expect(perms).not.toContain('admin:all');
    });

    it('should return read-only permissions for viewer role', () => {
      const perms = service.getPermissionsForRole('viewer');
      expect(perms).toContain('users:read');
      expect(perms).toContain('analytics:read');
      expect(perms).not.toContain('users:write');
    });

    it('should fall back to member for unknown roles', () => {
      const perms = service.getPermissionsForRole('nonexistent');
      expect(perms).toEqual(service.getPermissionsForRole('member'));
    });
  });

  describe('hasPermission', () => {
    it('should return true for owner with any permission', () => {
      expect(service.hasPermission('owner', 'users:delete')).toBe(true);
    });

    it('should return true when role has the permission', () => {
      expect(service.hasPermission('admin', 'users:write')).toBe(true);
    });

    it('should return false when role lacks the permission', () => {
      expect(service.hasPermission('viewer', 'users:write')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if any permission matches', () => {
      expect(service.hasAnyPermission('viewer', ['users:write', 'users:read'])).toBe(true);
    });

    it('should return false if no permissions match', () => {
      expect(service.hasAnyPermission('viewer', ['users:write', 'users:delete'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when all permissions present', () => {
      expect(service.hasAllPermissions('admin', ['users:read', 'users:write'])).toBe(true);
    });

    it('should return false when some permissions missing', () => {
      expect(service.hasAllPermissions('member', ['users:read', 'admin:all'])).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('should return success when permission exists', () => {
      const result = service.checkPermission('admin', ['admin:all'], 'users:write');
      expect(result.success).toBe(true);
    });

    it('should return failure when permission missing', () => {
      const result = service.checkPermission('viewer', ['users:read'], 'users:write');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS);
      }
    });
  });

  describe('validateRole', () => {
    it('should validate known roles', () => {
      expect(service.validateRole('owner')).toBe(true);
      expect(service.validateRole('admin')).toBe(true);
      expect(service.validateRole('member')).toBe(true);
      expect(service.validateRole('viewer')).toBe(true);
      expect(service.validateRole('service')).toBe(true);
    });

    it('should reject unknown roles', () => {
      expect(service.validateRole('superuser')).toBe(false);
      expect(service.validateRole('')).toBe(false);
    });
  });
});
