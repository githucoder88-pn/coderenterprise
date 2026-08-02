/**
 * Extension Registry
 *
 * Central registry for installed extensions.
 * Handles registration, lookup, filtering, and state management.
 */

import type { InstalledExtension, ExtensionManifest, ExtensionStatus, ExtensionKind } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IExtensionRegistry {
  register(manifest: ExtensionManifest, installPath: string): InstalledExtension;
  unregister(id: string): void;
  get(id: string): InstalledExtension | null;
  getAll(): readonly InstalledExtension[];
  getByKind(kind: ExtensionKind): readonly InstalledExtension[];
  getByStatus(status: ExtensionStatus): readonly InstalledExtension[];
  getActive(): readonly InstalledExtension[];
  updateStatus(id: string, status: ExtensionStatus): InstalledExtension;
  updateSettings(id: string, settings: Record<string, unknown>): InstalledExtension;
  setEnabled(id: string, enabled: boolean): InstalledExtension;
  has(id: string): boolean;
  search(query: string): readonly InstalledExtension[];
  getStats(): { total: number; active: number; byKind: Record<string, number>; byStatus: Record<string, number> };
}

export class ExtensionRegistry implements IExtensionRegistry {
  private readonly extensions = new Map<string, InstalledExtension>();

  constructor(private readonly logger: ILogger) {}

  register(manifest: ExtensionManifest, installPath: string): InstalledExtension {
    const now = new Date();
    const extension: InstalledExtension = {
      id: manifest.id, manifest, status: 'installed', installPath,
      installedVersion: manifest.version, enabled: true,
      permissions: manifest.permissions.map((p) => ({
        permission: p, granted: false, reason: 'Pending approval',
        grantedAt: null, revokedAt: null,
      })),
      settings: {}, lastActivatedAt: null, lastError: null, metadata: {},
      createdAt: now, updatedAt: now,
    };

    this.extensions.set(manifest.id, extension);
    this.logger.info({ id: manifest.id, version: manifest.version, kind: manifest.kind }, 'Extension registered');
    return extension;
  }

  unregister(id: string): void {
    this.extensions.delete(id);
    this.logger.info({ id }, 'Extension unregistered');
  }

  get(id: string): InstalledExtension | null { return this.extensions.get(id) ?? null; }
  getAll(): readonly InstalledExtension[] { return [...this.extensions.values()]; }

  getByKind(kind: ExtensionKind): readonly InstalledExtension[] {
    return this.getAll().filter((e) => e.manifest.kind === kind);
  }

  getByStatus(status: ExtensionStatus): readonly InstalledExtension[] {
    return this.getAll().filter((e) => e.status === status);
  }

  getActive(): readonly InstalledExtension[] {
    return this.getAll().filter((e) => e.status === 'active' && e.enabled);
  }

  updateStatus(id: string, status: ExtensionStatus): InstalledExtension {
    const ext = this.extensions.get(id);
    if (!ext) throw new Error(`Extension ${id} not found`);
    const updated = { ...ext, status, updatedAt: new Date() };
    this.extensions.set(id, updated);
    return updated;
  }

  updateSettings(id: string, settings: Record<string, unknown>): InstalledExtension {
    const ext = this.extensions.get(id);
    if (!ext) throw new Error(`Extension ${id} not found`);
    const updated = { ...ext, settings: { ...ext.settings, ...settings }, updatedAt: new Date() };
    this.extensions.set(id, updated);
    return updated;
  }

  setEnabled(id: string, enabled: boolean): InstalledExtension {
    const ext = this.extensions.get(id);
    if (!ext) throw new Error(`Extension ${id} not found`);
    const updated = { ...ext, enabled, updatedAt: new Date() };
    this.extensions.set(id, updated);
    this.logger.info({ id, enabled }, `Extension ${enabled ? 'enabled' : 'disabled'}`);
    return updated;
  }

  has(id: string): boolean { return this.extensions.has(id); }

  search(query: string): readonly InstalledExtension[] {
    const q = query.toLowerCase();
    return this.getAll().filter((e) =>
      e.manifest.name.toLowerCase().includes(q) || e.manifest.description.toLowerCase().includes(q) ||
      e.manifest.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }

  getStats(): { total: number; active: number; byKind: Record<string, number>; byStatus: Record<string, number> } {
    const all = this.getAll();
    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const ext of all) {
      byKind[ext.manifest.kind] = (byKind[ext.manifest.kind] ?? 0) + 1;
      byStatus[ext.status] = (byStatus[ext.status] ?? 0) + 1;
    }
    return { total: all.length, active: all.filter((e) => e.status === 'active').length, byKind, byStatus };
  }
}
