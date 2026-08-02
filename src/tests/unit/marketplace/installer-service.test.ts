/**
 * Installer Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InstallerService } from '../../../marketplace/installers/installer-service.js';
import { PackageRegistry } from '../../../marketplace/registry/package-registry.js';
import { createMockLogger } from '../../helpers.js';
import type { ArtifactKind } from '../../../marketplace/types.js';

describe('InstallerService', () => {
  let installer: InstallerService;
  let registry: PackageRegistry;

  beforeEach(() => {
    registry = new PackageRegistry(createMockLogger());
    installer = new InstallerService(registry, createMockLogger());
  });

  const publishTestPackage = async () => {
    return (await registry.publish({
      publisherId: 'pub-1', name: 'test-ext', slug: 'test-ext', displayName: 'Test',
      description: 'Test', kind: 'extension' as ArtifactKind, status: 'published',
      latestVersion: '1.0.0', license: 'MIT', homepage: null, repository: null,
      icon: null, banner: null, screenshots: [], categories: ['tools'], tags: [],
      keywords: [], monetization: { type: 'free', price: 0, currency: 'USD', interval: null, trialDays: 0, enterpriseContact: null },
      featured: false, verified: false, metadata: {},
    })).data!;
  };

  describe('install', () => {
    it('should install a package', async () => {
      const pkg = await publishTestPackage();
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });

      const result = await installer.install(pkg.id, '1.0.0', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.version).toBe('1.0.0');
    });

    it('should fail for non-existent package', async () => {
      const result = await installer.install('missing', '1.0.0', 'user-1');
      expect(result.success).toBe(false);
    });

    it('should track download count', async () => {
      const pkg = await publishTestPackage();
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });
      await installer.install(pkg.id, '1.0.0', 'user-1');
      const updated = await registry.getById(pkg.id);
      expect(updated!.stats.downloads).toBe(1);
    });
  });

  describe('uninstall', () => {
    it('should uninstall a package', async () => {
      const pkg = await publishTestPackage();
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });
      await installer.install(pkg.id, '1.0.0', 'user-1');
      const result = await installer.uninstall(pkg.id, 'user-1');
      expect(result.success).toBe(true);
      expect(await installer.isInstalled(pkg.id, 'user-1')).toBe(false);
    });
  });

  describe('getInstalled', () => {
    it('should list installed packages', async () => {
      const pkg = await publishTestPackage();
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });
      await installer.install(pkg.id, '1.0.0', 'user-1');
      const installed = await installer.getInstalled('user-1');
      expect(installed.length).toBe(1);
    });
  });

  describe('resolveDependencies', () => {
    it('should resolve dependencies', async () => {
      const pkg = await publishTestPackage();
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });
      const result = await installer.resolveDependencies(pkg.id, '1.0.0');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.length).toBe(0);
    });
  });
});
