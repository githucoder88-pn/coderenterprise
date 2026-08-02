/**
 * RBAC Service
 *
 * Role-based access control. Evaluates permissions from roles and custom grants.
 */

import { BaseService } from '../../core/base-service.js';
import {
  type Permission,
  type Role,
  ROLE_PERMISSIONS,
  ErrorCode,
  type Result,
} from '../../types/index.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IEventBus } from '../../core/event-bus.js';

export interface IRBACService {
  getPermissionsForRole(role: string): readonly Permission[];
  hasPermission(role: string, permission: Permission): boolean;
  hasAnyPermission(role: string, permissions: readonly Permission[]): boolean;
  hasAllPermissions(role: string, permissions: readonly Permission[]): boolean;
  checkPermission(
    userRole: string,
    userPermissions: readonly string[],
    required: Permission,
  ): Result<boolean>;
  validateRole(role: string): role is Role;
}

export class RBACService extends BaseService implements IRBACService {
  constructor(logger: ILogger, eventBus: IEventBus) {
    super(logger, eventBus);
  }

  getPermissionsForRole(role: string): readonly Permission[] {
    if (!this.validateRole(role)) {
      return ROLE_PERMISSIONS.member;
    }
    return ROLE_PERMISSIONS[role];
  }

  hasPermission(role: string, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes('admin:all') || permissions.includes(permission);
  }

  hasAnyPermission(
    role: string,
    permissions: readonly Permission[],
  ): boolean {
    const rolePerms = this.getPermissionsForRole(role);
    if (rolePerms.includes('admin:all')) return true;
    return permissions.some((p) => rolePerms.includes(p));
  }

  hasAllPermissions(
    role: string,
    permissions: readonly Permission[],
  ): boolean {
    const rolePerms = this.getPermissionsForRole(role);
    if (rolePerms.includes('admin:all')) return true;
    return permissions.every((p) => rolePerms.includes(p));
  }

  checkPermission(
    userRole: string,
    userPermissions: readonly string[],
    required: Permission,
  ): Result<boolean> {
    if (
      userPermissions.includes('admin:all') ||
      userPermissions.includes(required)
    ) {
      return this.success(true);
    }

    return this.failure(
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      `Permission denied: ${required} required`,
      { required, role: userRole },
    );
  }

  validateRole(role: string): role is Role {
    return (Object.keys(ROLE_PERMISSIONS) as string[]).includes(role);
  }
}
