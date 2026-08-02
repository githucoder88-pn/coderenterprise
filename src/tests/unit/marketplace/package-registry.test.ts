/**
 * Package Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PackageRegistry } from '../../../marketplace/registry/package-registry.js';
import { createMockLogger } from '../../helpers.js';
import type { ArtifactKind } from '../../../marketplace/types.js';

function makePackage(overrides?: Record<string, unknown>) {
  return {
    publisherId: 'pub-1', name: 'my-extension', slug: 'my-extension', displayName: 'My Extension',
    description: 'A great extension', kind: 'extension' as ArtifactKind, status: 'published' as const,
    latestVersion: '1.0.0', license: 'MIT', homepage: null, repository: null, icon: null, banner: null,
    screenshots: [], categories: ['tools'], tags: ['productivity'], keywords: ['ext'],
    monetization: { type: 'free' as const, price: 0, currency: 'USD', interval: null, trialDays: 0, enterpriseContact: null },
    featured: false, verified: false, metadata: {}, ...overrides,
  };
}

describe('PackageRegistry', () => {
  let registry: PackageRegistry;

  beforeEach(() => { registry = new PackageRegistry(createMockLogger()); });

  describe('publish', () => {
    it('should publish a package', async () => {
      const result = await registry.publish(makePackage());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('my-extension');
        expect(result.data.stats.downloads).toBe(0);
      }
    });

    it('should reject duplicate slugs', async () => {
      await registry.publish(makePackage());
      const result = await registry.publish(makePackage());
      expect(result.success).toBe(false);
    });
  });

  describe('getById / getBySlug', () => {
    it('should find by ID', async () => {
      const published = (await registry.publish(makePackage())).data!;
      expect(await registry.getById(published.id)).not.toBeNull();
    });

    it('should find by slug', async () => {
      await registry.publish(makePackage());
      expect(await registry.getBySlug('my-extension')).not.toBeNull();
    });
  });

  describe('publishVersion', () => {
    it('should publish a version', async () => {
      const pkg = (await registry.publish(makePackage())).data!;
      const result = await registry.publishVersion(pkg.id, {
        version: '1.0.0', changelog: 'Initial release', dependencies: [], permissions: [],
      });
      expect(result.success).toBe(true);
    });

    it('should update package latest version', async () => {
      const pkg = (await registry.publish(makePackage())).data!;
      await registry.publishVersion(pkg.id, { version: '1.0.0', changelog: '', dependencies: [], permissions: [] });
      await registry.publishVersion(pkg.id, { version: '1.1.0', changelog: 'Update', dependencies: [], permissions: [] });
      const updated = await registry.getById(pkg.id);
      expect(updated!.latestVersion).toBe('1.1.0');
    });
  });

  describe('search', () => {
    it('should search by query', async () => {
      await registry.publish(makePackage({ name: 'git-tools', displayName: 'Git Tools', keywords: ['git'] }));
      await registry.publish(makePackage({ name: 'theme-pack', slug: 'theme-pack', displayName: 'Theme Pack', keywords: ['theme'], categories: ['themes'] }));

      const result = await registry.search('git');
      expect(result.data.length).toBe(1);
    });

    it('should filter by kind', async () => {
      await registry.publish(makePackage({ kind: 'extension', slug: 'ext1' }));
      await registry.publish(makePackage({ name: 'agent', slug: 'agent1', kind: 'agent' }));

      const result = await registry.search('', { kind: 'agent' });
      expect(result.data.length).toBe(1);
    });

    it('should sort by downloads', async () => {
      const p1 = (await registry.publish(makePackage({ slug: 'a' }))).data!;
      const p2 = (await registry.publish(makePackage({ name: 'b', slug: 'b' }))).data!;
      await registry.recordDownload(p1.id, 'v1', 'user-1');
      await registry.recordDownload(p1.id, 'v1', 'user-2');

      const result = await registry.search('', { sort: 'downloads' });
      expect(result.data[0]!.id).toBe(p1.id);
    });
  });

  describe('recordDownload', () => {
    it('should increment download count', async () => {
      const pkg = (await registry.publish(makePackage())).data!;
      await registry.recordDownload(pkg.id, 'v1', 'user-1');
      await registry.recordDownload(pkg.id, 'v1', 'user-2');
      const updated = await registry.getById(pkg.id);
      expect(updated!.stats.downloads).toBe(2);
    });
  });

  describe('getFeatured / getPopular / getRecent', () => {
    it('should return featured packages', async () => {
      await registry.publish(makePackage({ featured: true, slug: 'feat' }));
      await registry.publish(makePackage({ name: 'b', slug: 'b' }));
      const featured = await registry.getFeatured();
      expect(featured.length).toBe(1);
    });
  });

  describe('suspend / archive', () => {
    it('should suspend a package', async () => {
      const pkg = (await registry.publish(makePackage())).data!;
      await registry.suspend(pkg.id, 'Policy violation');
      const updated = await registry.getById(pkg.id);
      expect(updated!.status).toBe('suspended');
    });
  });
});
