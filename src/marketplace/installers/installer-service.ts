/**
 * Installer Service
 *
 * Handles package installation, updates, uninstallation, and dependency resolution.
 */

import type { Package, PackageVersion, VersionDependency } from '../types.js';
import type { PackageRegistry } from '../registry/package-registry.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface InstalledPackage {
  readonly packageId: string;
  readonly version: string;
  readonly installedAt: Date;
  readonly enabled: boolean;
}

export interface IInstallerService {
  install(packageId: string, version: string, userId: string): Promise<Result<InstalledPackage>>;
  uninstall(packageId: string, userId: string): Promise<Result<void>>;
  update(packageId: string, userId: string): Promise<Result<InstalledPackage>>;
  getInstalled(userId: string): Promise<readonly InstalledPackage[]>;
  isInstalled(packageId: string, userId: string): Promise<boolean>;
  resolveDependencies(packageId: string, version: string): Promise<Result<readonly { packageId: string; version: string; resolved: boolean }[]>>;
  checkCompatibility(packageId: string, version: string): Promise<{ compatible: boolean; issues: readonly string[] }>;
}

export class InstallerService implements IInstallerService {
  private readonly installed = new Map<string, Map<string, InstalledPackage>>(); // userId -> packageId -> installed

  constructor(
    private readonly registry: PackageRegistry,
    private readonly logger: ILogger,
  ) {}

  async install(packageId: string, version: string, userId: string): Promise<Result<InstalledPackage>> {
    const pkg = await this.registry.getById(packageId);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };

    const ver = await this.registry.getVersion(packageId, version);
    if (!ver) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Version ${version} not found`, timestamp: new Date() } };

    // Resolve dependencies
    const deps = await this.resolveDependencies(packageId, version);
    if (deps.success) {
      const unresolved = deps.data.filter((d) => !d.resolved);
      if (unresolved.length > 0) {
        return { success: false, error: { code: ErrorCode.VALIDATION, message: `Unresolved dependencies: ${unresolved.map((d) => d.packageId).join(', ')}`, timestamp: new Date() } };
      }
    }

    // Record download
    await this.registry.recordDownload(packageId, ver.id, userId);

    // Store installation
    if (!this.installed.has(userId)) this.installed.set(userId, new Map());
    const now = new Date();
    const installed: InstalledPackage = { packageId, version, installedAt: now, enabled: true };
    this.installed.get(userId)!.set(packageId, installed);

    this.logger.info({ packageId, version, userId }, 'Package installed');
    return { success: true, data: installed };
  }

  async uninstall(packageId: string, userId: string): Promise<Result<void>> {
    const userPkgs = this.installed.get(userId);
    if (!userPkgs?.has(packageId)) {
      return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not installed', timestamp: new Date() } };
    }
    userPkgs.delete(packageId);
    this.logger.info({ packageId, userId }, 'Package uninstalled');
    return { success: true, data: undefined };
  }

  async update(packageId: string, userId: string): Promise<Result<InstalledPackage>> {
    const userPkgs = this.installed.get(userId);
    const current = userPkgs?.get(packageId);
    if (!current) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not installed', timestamp: new Date() } };

    const pkg = await this.registry.getById(packageId);
    if (!pkg) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Package not found', timestamp: new Date() } };

    if (pkg.latestVersion === current.version) {
      return { success: true, data: current }; // Already up to date
    }

    return this.install(packageId, pkg.latestVersion, userId);
  }

  async getInstalled(userId: string): Promise<readonly InstalledPackage[]> {
    return [...(this.installed.get(userId)?.values() ?? [])];
  }

  async isInstalled(packageId: string, userId: string): Promise<boolean> {
    return this.installed.get(userId)?.has(packageId) ?? false;
  }

  async resolveDependencies(packageId: string, version: string): Promise<Result<readonly { packageId: string; version: string; resolved: boolean }[]>> {
    const ver = await this.registry.getVersion(packageId, version);
    if (!ver) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Version not found', timestamp: new Date() } };

    const resolved = await Promise.all(
      ver.dependencies.map(async (dep) => {
        const depPkg = await this.registry.getById(dep.packageId);
        if (!depPkg) return { packageId: dep.packageId, version: dep.versionRange, resolved: false };
        return { packageId: dep.packageId, version: depPkg.latestVersion, resolved: true };
      }),
    );

    return { success: true, data: resolved };
  }

  async checkCompatibility(packageId: string, version: string): Promise<{ compatible: boolean; issues: readonly string[] }> {
    const ver = await this.registry.getVersion(packageId, version);
    if (!ver) return { compatible: false, issues: ['Version not found'] };
    // In production: check engine compatibility, platform support, etc.
    return { compatible: true, issues: [] };
  }
}
