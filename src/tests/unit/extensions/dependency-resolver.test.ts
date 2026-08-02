/**
 * Dependency Resolver Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyResolver } from '../../../extensions/dependencies/dependency-resolver.js';
import { ExtensionRegistry } from '../../../extensions/registry/extension-registry.js';
import { createMockLogger } from '../../helpers.js';
import type { ExtensionManifest } from '../../../extensions/types.js';

function makeManifest(id: string, version: string, deps: { id: string; version: string }[] = []): ExtensionManifest {
  return {
    id, name: id, publisher: 'test', version, description: '', kind: 'tool', main: 'index.js',
    icon: null, license: 'MIT', homepage: null, repository: null,
    permissions: [], dependencies: deps.map((d) => ({ ...d, optional: false })),
    activationEvents: ['*'], contributes: {}, engines: { coder: '>=1.0.0' }, keywords: [], categories: [],
  };
}

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = new ExtensionRegistry(createMockLogger());
    resolver = new DependencyResolver(registry, createMockLogger());
  });

  describe('resolve', () => {
    it('should resolve installed dependencies', () => {
      registry.register(makeManifest('lib-a', '1.2.0'), '/ext/lib-a');
      const result = resolver.resolve([{ id: 'lib-a', version: '>=1.0.0', optional: false }]);
      expect(result[0]!.resolved).toBe(true);
    });

    it('should fail for missing dependencies', () => {
      const result = resolver.resolve([{ id: 'missing', version: '1.0.0', optional: false }]);
      expect(result[0]!.resolved).toBe(false);
    });

    it('should detect version conflicts', () => {
      registry.register(makeManifest('lib-a', '0.9.0'), '/ext/lib-a');
      const result = resolver.resolve([{ id: 'lib-a', version: '>=1.0.0', optional: false }]);
      expect(result[0]!.resolved).toBe(false);
      expect(result[0]!.conflictWith).toContain('0.9.0');
    });
  });

  describe('validate', () => {
    it('should validate valid dependencies', () => {
      registry.register(makeManifest('dep-1', '1.0.0'), '/ext/dep-1');
      const result = resolver.validate('my-ext', [{ id: 'dep-1', version: '*', optional: false }]);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject self-dependency', () => {
      const result = resolver.validate('my-ext', [{ id: 'my-ext', version: '*', optional: false }]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('itself'))).toBe(true);
    });
  });

  describe('satisfiesVersion', () => {
    it('should match exact versions', () => {
      expect(resolver.satisfiesVersion('1.0.0', '1.0.0')).toBe(true);
      expect(resolver.satisfiesVersion('1.0.0', '2.0.0')).toBe(false);
    });

    it('should match wildcard', () => {
      expect(resolver.satisfiesVersion('1.2.3', '*')).toBe(true);
    });

    it('should match caret ranges', () => {
      expect(resolver.satisfiesVersion('1.2.3', '^1.0.0')).toBe(true);
      expect(resolver.satisfiesVersion('2.0.0', '^1.0.0')).toBe(false);
    });

    it('should match tilde ranges', () => {
      expect(resolver.satisfiesVersion('1.2.3', '~1.2.0')).toBe(true);
      expect(resolver.satisfiesVersion('1.3.0', '~1.2.0')).toBe(false);
    });

    it('should match >= ranges', () => {
      expect(resolver.satisfiesVersion('2.0.0', '>=1.0.0')).toBe(true);
      expect(resolver.satisfiesVersion('0.9.0', '>=1.0.0')).toBe(false);
    });
  });
});
