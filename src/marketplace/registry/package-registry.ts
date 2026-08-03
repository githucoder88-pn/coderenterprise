/**
 * Package Registry
 *
 * Core registry for marketplace packages.
 * Handles publishing, versioning, search, and statistics.
 */

import type {
  Package, PackageVersion, ArtifactKind,
PackageStats,
} from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result, type PaginationParams, type PaginatedResponse } from '../../types/index.js';
import { createPaginatedResponse } from '../../types/index.js';

export interface IPackageRegistry {
  publish(pkg: Omit<Package, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<Result<Package>>;
  getById(id: string): Promise<Package | null>;
  getBySlug(slug: string): Promise<Package | null>;
  update(id: string, updates: Partial<Omit<Package, 'id' | 'publisherId' | 'stats'>>): Promise<Result<Package>>;
  publishVersion(packageId: string, version: Omit<PackageVersion, 'id' | 'packageId' | 'status' | 'artifactUrl' | 'artifactSize' | 'artifactHash' | 'securityScan' | 'publishedAt' | 'createdAt' | 'updatedAt'>): Promise<Result<PackageVersion>>;
  getVersion(packageId: string, version: string): Promise<PackageVersion | null>;
  getVersions(packageId: string): Promise<readonly PackageVersion[]>;
  approveVersion(versionId: string): Promise<Result<void>>;
  rejectVersion(versionId: string, reason: string): Promise<Result<void>>;
  recordDownload(packageId: string, versionId: string, userId: string): Promise<void>;
  search(query: string, filters?: { kind?: ArtifactKind; category?: string; monetization?: string; sort?: string }, pagination?: PaginationParams): Promise<PaginatedResponse<Package>>;
  getByCategory(category: string, pagination: PaginationParams): Promise<PaginatedResponse<Package>>;
  getFeatured(limit?: number): Promise<readonly Package[]>;
  getPopular(limit?: number): Promise<readonly Package[]>;
  getRecent(limit?: number): Promise<readonly Package[]>;
  getStats(): Promise<{ totalPackages: number; totalVersions: number; totalDownloads: number; byKind: Record<string, number> }>;
  suspend(id: string, reason: string): Promise<Result<void>>;
  archive(id: string): Promise<Result<void>>;
}

export class PackageRegistry implements IPackageRegistry {
  private readonly packages = new Map<string, Package>();
  private readonly versions = new Map<string, PackageVersion>();
  private readonly slugIndex = new Map<string, string>();

  constructor(private readonly logger: ILogger) {}

  async publish(pkg: Omit<Package, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<Result<Package>> {
    if (this.slugIndex.has(pkg.slug)) {
      return { success: false, error: { code: ErrorCode.CONFLICT, message: `Package slug '${pkg.slug}' already exists`, timestamp: new Date() } };
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stats: PackageStats = {
      downloads: 0, downloadsWeek: 0, downloadsMonth: 0, activeInstalls: 0,
      rating: 0, ratingCount: 0, reviewCount: 0, qualityScore: 0, compatibilityScore: 0,
    };

    const fullPkg: Package = { ...pkg, id, stats, createdAt: now, updatedAt: now };
    this.packages.set(id, fullPkg);
    this.slugIndex.set(pkg.slug, id);
    this.logger.info({ id, name: pkg.name, kind: pkg.kind, publisher: pkg.publisherId }, 'Package published');
    return { success: true, data: fullPkg };
  }

  async getById(id: string): Promise<Package | null> { return this.packages.get(id) ?? null; }

  async getBySlug(slug: string): Promise<Package | null> {
    const id = this.slugIndex.get(slug);
    return id ? this.packages.get(id) ?? null : null;
  }

  async update(id: string, updates: Partial<Omit<Package, 'id' | 'publisherId' | 'stats'>>): Promise<Result<Package>> {
    const pkg = this.packages.get(id);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };
    const updated = { ...pkg, ...updates, updatedAt: new Date() };
    this.packages.set(id, updated);
    return { success: true, data: updated };
  }

  async publishVersion(packageId: string, version: Omit<PackageVersion, 'id' | 'packageId' | 'status' | 'artifactUrl' | 'artifactSize' | 'artifactHash' | 'securityScan' | 'publishedAt' | 'createdAt' | 'updatedAt'>): Promise<Result<PackageVersion>> {
    const pkg = this.packages.get(packageId);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };

    const id = crypto.randomUUID();
    const now = new Date();
    const fullVersion: PackageVersion = {
      ...version, id, packageId, status: 'pending_review',
      artifactUrl: `artifacts/${packageId}/${version.version}`,
      artifactSize: 0, artifactHash: '', securityScan: null,
      publishedAt: null, metadata: {}, createdAt: now, updatedAt: now,
    };

    this.versions.set(id, fullVersion);

    // Auto-approve for now (production: run security scan)
    const approvedVersion: PackageVersion = { ...fullVersion, status: 'published', publishedAt: now };
    this.versions.set(id, approvedVersion);

    // Update package latest version
    this.packages.set(packageId, { ...pkg, latestVersion: version.version, updatedAt: now });

    this.logger.info({ packageId, version: version.version }, 'Version published');
    return { success: true, data: fullVersion };
  }

  async getVersion(packageId: string, version: string): Promise<PackageVersion | null> {
    return [...this.versions.values()].find((v) => v.packageId === packageId && v.version === version) ?? null;
  }

  async getVersions(packageId: string): Promise<readonly PackageVersion[]> {
    return [...this.versions.values()]
      .filter((v) => v.packageId === packageId)
      .sort((a, b) => this.compareVersions(b.version, a.version));
  }

  async approveVersion(versionId: string): Promise<Result<void>> {
    const ver = this.versions.get(versionId);
    if (!ver) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Version not found', timestamp: new Date() } };
    this.versions.set(versionId, { ...ver, status: 'published', publishedAt: new Date(), updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async rejectVersion(versionId: string, _reason: string): Promise<Result<void>> {
    const ver = this.versions.get(versionId);
    if (!ver) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Version not found', timestamp: new Date() } };
    this.versions.set(versionId, { ...ver, status: 'rejected', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async recordDownload(packageId: string, _versionId: string, _userId: string): Promise<void> {
    const pkg = this.packages.get(packageId);
    if (!pkg) return;
    this.packages.set(packageId, {
      ...pkg,
      stats: {
        ...pkg.stats,
        downloads: pkg.stats.downloads + 1,
        downloadsWeek: pkg.stats.downloadsWeek + 1,
        downloadsMonth: pkg.stats.downloadsMonth + 1,
      },
      updatedAt: new Date(),
    });
  }

  async search(query: string, filters?: { kind?: ArtifactKind; category?: string; monetization?: string; sort?: string }, pagination?: PaginationParams): Promise<PaginatedResponse<Package>> {
    const q = query?.toLowerCase() ?? '';
    let results = [...this.packages.values()].filter((p) => p.status === 'published');

    if (q) {
      results = results.filter((p) =>
        p.name.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) || p.keywords.some((k) => k.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (filters?.kind) results = results.filter((p) => p.kind === filters.kind);
    if (filters?.category) results = results.filter((p) => p.categories.includes(filters.category!));
    if (filters?.monetization) results = results.filter((p) => p.monetization.type === filters.monetization);

    // Sort
    const sort = filters?.sort ?? 'relevance';
    switch (sort) {
      case 'downloads': results.sort((a, b) => b.stats.downloads - a.stats.downloads); break;
      case 'rating': results.sort((a, b) => b.stats.rating - a.stats.rating); break;
      case 'newest': results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
      case 'updated': results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); break;
      default: // relevance — already filtered by search match
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const start = (page - 1) * limit;
    return createPaginatedResponse(results.slice(start, start + limit), results.length, { page, limit });
  }

  async getByCategory(category: string, pagination: PaginationParams): Promise<PaginatedResponse<Package>> {
    return this.search('', { category }, pagination);
  }

  async getFeatured(limit = 10): Promise<readonly Package[]> {
    return [...this.packages.values()].filter((p) => p.featured && p.status === 'published').slice(0, limit);
  }

  async getPopular(limit = 20): Promise<readonly Package[]> {
    return [...this.packages.values()]
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.stats.downloads - a.stats.downloads)
      .slice(0, limit);
  }

  async getRecent(limit = 20): Promise<readonly Package[]> {
    return [...this.packages.values()]
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getStats(): Promise<{ totalPackages: number; totalVersions: number; totalDownloads: number; byKind: Record<string, number> }> {
    const pkgs = [...this.packages.values()];
    const byKind: Record<string, number> = {};
    let totalDownloads = 0;
    for (const p of pkgs) {
      byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
      totalDownloads += p.stats.downloads;
    }
    return { totalPackages: pkgs.length, totalVersions: this.versions.size, totalDownloads, byKind };
  }

  async suspend(id: string, _reason: string): Promise<Result<void>> {
    const pkg = this.packages.get(id);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };
    this.packages.set(id, { ...pkg, status: 'suspended', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  async archive(id: string): Promise<Result<void>> {
    const pkg = this.packages.get(id);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };
    this.packages.set(id, { ...pkg, status: 'archived', updatedAt: new Date() });
    return { success: true, data: undefined };
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
      if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
    }
    return 0;
  }
}
