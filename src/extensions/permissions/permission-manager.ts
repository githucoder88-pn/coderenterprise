/**
 * Permission Manager
 *
 * Manages extension permissions: grant, revoke, check, audit.
 */

import type { ExtensionPermission, PermissionGrant } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IPermissionManager {
  initialize(extensionId: string, permissions: readonly ExtensionPermission[]): void;
  grant(extensionId: string, permission: ExtensionPermission): void;
  revoke(extensionId: string, permission: ExtensionPermission): void;
  revokeAll(extensionId: string): void;
  check(extensionId: string, permission: ExtensionPermission): boolean;
  getGranted(extensionId: string): readonly ExtensionPermission[];
  getPending(extensionId: string): readonly ExtensionPermission[];
  grantAll(extensionId: string): void;
  getAuditLog(): readonly { extensionId: string; permission: ExtensionPermission; action: 'grant' | 'revoke'; timestamp: Date }[];
}

export class PermissionManager implements IPermissionManager {
  private readonly grants = new Map<string, Map<ExtensionPermission, PermissionGrant>>();
  private readonly auditLog: { extensionId: string; permission: ExtensionPermission; action: 'grant' | 'revoke'; timestamp: Date }[] = [];

  constructor(private readonly logger: ILogger) {}

  initialize(extensionId: string, permissions: readonly ExtensionPermission[]): void {
    const map = new Map<ExtensionPermission, PermissionGrant>();
    for (const perm of permissions) {
      map.set(perm, {
        permission: perm, granted: false, reason: 'Pending user approval',
        grantedAt: null, revokedAt: null,
      });
    }
    this.grants.set(extensionId, map);
    this.logger.debug({ extensionId, permissions }, 'Permissions initialized');
  }

  grant(extensionId: string, permission: ExtensionPermission): void {
    const map = this.grants.get(extensionId);
    if (!map) throw new Error(`Extension ${extensionId} has no permission registry`);

    const grant = map.get(permission);
    if (!grant) throw new Error(`Permission ${permission} not registered for ${extensionId}`);

    map.set(permission, { ...grant, granted: true, reason: 'User approved', grantedAt: new Date(), revokedAt: null });
    this.auditLog.push({ extensionId, permission, action: 'grant', timestamp: new Date() });
    this.logger.info({ extensionId, permission }, 'Permission granted');
  }

  revoke(extensionId: string, permission: ExtensionPermission): void {
    const map = this.grants.get(extensionId);
    if (!map) return;

    const grant = map.get(permission);
    if (!grant) return;

    map.set(permission, { ...grant, granted: false, reason: 'Revoked', revokedAt: new Date() });
    this.auditLog.push({ extensionId, permission, action: 'revoke', timestamp: new Date() });
    this.logger.info({ extensionId, permission }, 'Permission revoked');
  }

  revokeAll(extensionId: string): void {
    const map = this.grants.get(extensionId);
    if (!map) return;
    for (const [perm, grant] of map) {
      if (grant.granted) this.revoke(extensionId, perm);
    }
  }

  grantAll(extensionId: string): void {
    const map = this.grants.get(extensionId);
    if (!map) return;
    for (const perm of map.keys()) {
      this.grant(extensionId, perm);
    }
  }

  check(extensionId: string, permission: ExtensionPermission): boolean {
    const map = this.grants.get(extensionId);
    if (!map) return false;
    return map.get(permission)?.granted ?? false;
  }

  getGranted(extensionId: string): readonly ExtensionPermission[] {
    const map = this.grants.get(extensionId);
    if (!map) return [];
    return [...map.entries()].filter(([, g]) => g.granted).map(([p]) => p);
  }

  getPending(extensionId: string): readonly ExtensionPermission[] {
    const map = this.grants.get(extensionId);
    if (!map) return [];
    return [...map.entries()].filter(([, g]) => !g.granted).map(([p]) => p);
  }

  getAuditLog(): readonly { extensionId: string; permission: ExtensionPermission; action: 'grant' | 'revoke'; timestamp: Date }[] {
    return this.auditLog;
  }
}
