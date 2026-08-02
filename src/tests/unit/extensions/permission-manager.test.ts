/**
 * Permission Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '../../../extensions/permissions/permission-manager.js';
import { createMockLogger } from '../../helpers.js';

describe('PermissionManager', () => {
  let pm: PermissionManager;

  beforeEach(() => { pm = new PermissionManager(createMockLogger()); });

  it('should initialize permissions', () => {
    pm.initialize('ext-1', ['filesystem.read', 'terminal.execute']);
    expect(pm.getPending('ext-1')).toEqual(['filesystem.read', 'terminal.execute']);
    expect(pm.getGranted('ext-1').length).toBe(0);
  });

  it('should grant permissions', () => {
    pm.initialize('ext-1', ['filesystem.read', 'terminal.execute']);
    pm.grant('ext-1', 'filesystem.read');
    expect(pm.check('ext-1', 'filesystem.read')).toBe(true);
    expect(pm.check('ext-1', 'terminal.execute')).toBe(false);
  });

  it('should revoke permissions', () => {
    pm.initialize('ext-1', ['filesystem.read']);
    pm.grant('ext-1', 'filesystem.read');
    pm.revoke('ext-1', 'filesystem.read');
    expect(pm.check('ext-1', 'filesystem.read')).toBe(false);
  });

  it('should grant all permissions', () => {
    pm.initialize('ext-1', ['filesystem.read', 'terminal.execute', 'network.access']);
    pm.grantAll('ext-1');
    expect(pm.getGranted('ext-1').length).toBe(3);
  });

  it('should revoke all permissions', () => {
    pm.initialize('ext-1', ['filesystem.read', 'terminal.execute']);
    pm.grantAll('ext-1');
    pm.revokeAll('ext-1');
    expect(pm.getGranted('ext-1').length).toBe(0);
  });

  it('should audit log actions', () => {
    pm.initialize('ext-1', ['filesystem.read']);
    pm.grant('ext-1', 'filesystem.read');
    pm.revoke('ext-1', 'filesystem.read');
    const log = pm.getAuditLog();
    expect(log.length).toBe(2);
    expect(log[0]!.action).toBe('grant');
    expect(log[1]!.action).toBe('revoke');
  });
});
