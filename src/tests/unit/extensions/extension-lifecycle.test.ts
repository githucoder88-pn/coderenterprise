/**
 * Extension Lifecycle Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionRegistry } from '../../../extensions/registry/extension-registry.js';
import { ExtensionLifecycleManager } from '../../../extensions/lifecycle/extension-lifecycle.js';
import { PermissionManager } from '../../../extensions/permissions/permission-manager.js';
import { DependencyResolver } from '../../../extensions/dependencies/dependency-resolver.js';
import { EventBus } from '../../../core/event-bus.js';
import { createMockLogger } from '../../helpers.js';
import type { ExtensionManifest } from '../../../extensions/types.js';

function makeManifest(overrides?: Partial<ExtensionManifest>): ExtensionManifest {
  return {
    id: 'test-ext', name: 'Test', publisher: 'test', version: '1.0.0',
    description: '', kind: 'tool', main: 'index.js', icon: null, license: 'MIT',
    homepage: null, repository: null, permissions: ['filesystem.read'],
    dependencies: [], activationEvents: ['*'], contributes: {},
    engines: { coder: '>=1.0.0' }, keywords: [], categories: [],
    ...overrides,
  };
}

describe('ExtensionLifecycleManager', () => {
  let lifecycle: ExtensionLifecycleManager;
  let registry: ExtensionRegistry;

  beforeEach(() => {
    const logger = createMockLogger();
    registry = new ExtensionRegistry(logger);
    const permissions = new PermissionManager(logger);
    const dependencies = new DependencyResolver(registry, logger);
    const eventBus = new EventBus();
    lifecycle = new ExtensionLifecycleManager(registry, permissions, dependencies, eventBus, logger);
  });

  describe('install', () => {
    it('should install an extension', async () => {
      const result = await lifecycle.install(makeManifest(), '/ext/test');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('installed');
    });

    it('should reject duplicate installation', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      const result = await lifecycle.install(makeManifest(), '/ext/test');
      expect(result.success).toBe(false);
    });

    it('should track install events', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      const events = lifecycle.getEventHistory('test-ext');
      expect(events.length).toBe(1);
      expect(events[0]!.name).toBe('onInstall');
    });
  });

  describe('activate / deactivate', () => {
    it('should activate an installed extension', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      const result = await lifecycle.activate('test-ext');
      expect(result.success).toBe(true);
      expect(registry.get('test-ext')!.status).toBe('active');
    });

    it('should deactivate an active extension', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      await lifecycle.activate('test-ext');
      const result = await lifecycle.deactivate('test-ext');
      expect(result.success).toBe(true);
      expect(registry.get('test-ext')!.status).toBe('inactive');
    });

    it('should fail to activate unknown extension', async () => {
      const result = await lifecycle.activate('unknown');
      expect(result.success).toBe(false);
    });
  });

  describe('update', () => {
    it('should update extension version', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      const result = await lifecycle.update('test-ext', makeManifest({ version: '2.0.0' }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.installedVersion).toBe('2.0.0');
    });
  });

  describe('uninstall', () => {
    it('should uninstall an extension', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      const result = await lifecycle.uninstall('test-ext');
      expect(result.success).toBe(true);
      expect(registry.get('test-ext')).toBeNull();
    });
  });

  describe('enable / disable', () => {
    it('should enable and disable extensions', async () => {
      await lifecycle.install(makeManifest(), '/ext/test');
      lifecycle.disable('test-ext');
      expect(registry.get('test-ext')!.enabled).toBe(false);
      lifecycle.enable('test-ext');
      expect(registry.get('test-ext')!.enabled).toBe(true);
    });
  });
});
