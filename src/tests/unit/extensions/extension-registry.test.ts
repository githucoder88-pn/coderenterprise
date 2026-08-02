/**
 * Extension Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionRegistry } from '../../../extensions/registry/extension-registry.js';
import { createMockLogger } from '../../helpers.js';
import type { ExtensionManifest } from '../../../extensions/types.js';

function makeManifest(overrides?: Partial<ExtensionManifest>): ExtensionManifest {
  return {
    id: 'test-ext', name: 'Test Extension', publisher: 'test', version: '1.0.0',
    description: 'A test extension', kind: 'tool', main: 'index.js',
    icon: null, license: 'MIT', homepage: null, repository: null,
    permissions: ['filesystem.read'], dependencies: [],
    activationEvents: ['*'], contributes: {},
    engines: { coder: '>=1.0.0' }, keywords: ['test'], categories: ['tools'],
    ...overrides,
  };
}

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => { registry = new ExtensionRegistry(createMockLogger()); });

  describe('register', () => {
    it('should register an extension', () => {
      const ext = registry.register(makeManifest(), '/ext/test');
      expect(ext.id).toBe('test-ext');
      expect(ext.status).toBe('installed');
      expect(ext.enabled).toBe(true);
    });

    it('should initialize permissions', () => {
      const ext = registry.register(makeManifest({ permissions: ['filesystem.read', 'terminal.execute'] }), '/ext/test');
      expect(ext.permissions.length).toBe(2);
      expect(ext.permissions[0]!.granted).toBe(false);
    });
  });

  describe('get', () => {
    it('should return null for unknown extension', () => {
      expect(registry.get('unknown')).toBeNull();
    });
  });

  describe('getByKind', () => {
    it('should filter by kind', () => {
      registry.register(makeManifest({ id: 'a', kind: 'tool' }), '/a');
      registry.register(makeManifest({ id: 'b', kind: 'theme' }), '/b');
      registry.register(makeManifest({ id: 'c', kind: 'tool' }), '/c');
      expect(registry.getByKind('tool').length).toBe(2);
    });
  });

  describe('updateStatus', () => {
    it('should update extension status', () => {
      registry.register(makeManifest(), '/ext');
      const updated = registry.updateStatus('test-ext', 'active');
      expect(updated.status).toBe('active');
    });
  });

  describe('setEnabled', () => {
    it('should toggle enabled state', () => {
      registry.register(makeManifest(), '/ext');
      registry.setEnabled('test-ext', false);
      expect(registry.get('test-ext')!.enabled).toBe(false);
    });
  });

  describe('search', () => {
    it('should search by name and keywords', () => {
      registry.register(makeManifest({ name: 'Git Tools', keywords: ['git', 'vcs'] }), '/a');
      registry.register(makeManifest({ id: 'b', name: 'Theme Pack', keywords: ['theme'] }), '/b');
      expect(registry.search('git').length).toBe(1);
      expect(registry.search('theme').length).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', () => {
      registry.register(makeManifest({ id: 'a', kind: 'tool' }), '/a');
      registry.register(makeManifest({ id: 'b', kind: 'theme' }), '/b');
      registry.updateStatus('a', 'active');
      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.byKind['tool']).toBe(1);
    });
  });
});
