/**
 * Extension Lifecycle Manager
 *
 * Manages the full lifecycle: install → activate → deactivate → update → uninstall.
 * Handles state transitions, error recovery, and event emission.
 */

import type { InstalledExtension, ExtensionManifest, ExtensionEvent, ExtensionEventName } from '../types.js';
import type { ExtensionRegistry } from '../registry/extension-registry.js';
import type { PermissionManager } from '../permissions/permission-manager.js';
import type { DependencyResolver } from '../dependencies/dependency-resolver.js';
import type { ILogger } from '../../telemetry/logger.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IExtensionLifecycleManager {
  install(manifest: ExtensionManifest, installPath: string): Promise<Result<InstalledExtension>>;
  activate(id: string): Promise<Result<void>>;
  deactivate(id: string): Promise<Result<void>>;
  update(id: string, newManifest: ExtensionManifest): Promise<Result<InstalledExtension>>;
  uninstall(id: string): Promise<Result<void>>;
  reload(id: string): Promise<Result<void>>;
  enable(id: string): Result<void>;
  disable(id: string): Result<void>;
  getEventHistory(extensionId: string): readonly ExtensionEvent[];
}

export class ExtensionLifecycleManager implements IExtensionLifecycleManager {
  private readonly eventHistory: ExtensionEvent[] = [];
  private readonly activationHandlers = new Map<string, () => Promise<void>>();
  private readonly deactivationHandlers = new Map<string, () => Promise<void>>();

  constructor(
    private readonly registry: ExtensionRegistry,
    private readonly permissions: PermissionManager,
    private readonly dependencies: DependencyResolver,
    private readonly logger: ILogger,
  ) {}

  async install(manifest: ExtensionManifest, installPath: string): Promise<Result<InstalledExtension>> {
    // Validate manifest
    if (this.registry.has(manifest.id)) {
      return { success: false, error: { code: ErrorCode.CONFLICT, message: `Extension ${manifest.id} already installed`, timestamp: new Date() } };
    }

    // Resolve dependencies
    const deps = this.dependencies.resolve(manifest.dependencies);
    const unresolved = deps.filter((d) => !d.resolved && !manifest.dependencies.find((dep) => dep.id === d.id)?.optional);
    if (unresolved.length > 0) {
      return { success: false, error: { code: ErrorCode.VALIDATION, message: `Unresolved dependencies: ${unresolved.map((d) => d.id).join(', ')}`, timestamp: new Date() } };
    }

    // Register
    const extension = this.registry.register(manifest, installPath);

    // Initialize permissions
    this.permissions.initialize(extension.id, manifest.permissions);

    this.emitEvent('onInstall', extension.id, { version: manifest.version });
    this.logger.info({ id: manifest.id, version: manifest.version }, 'Extension installed');

    return { success: true, data: extension };
  }

  async activate(id: string): Promise<Result<void>> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };
    if (ext.status === 'active') return { success: true, data: undefined };

    // Check permissions are granted
    const ungranted = ext.permissions.filter((p) => !p.granted);
    if (ungranted.length > 0) {
      this.logger.warn({ id, ungranted: ungranted.map((p) => p.permission) }, 'Extension has ungranted permissions');
    }

    this.registry.updateStatus(id, 'activating');

    try {
      // Run activation handler if registered
      const handler = this.activationHandlers.get(id);
      if (handler) await handler();

      this.registry.updateStatus(id, 'active');
      this.emitEvent('onActivate', id, {});
      this.logger.info({ id }, 'Extension activated');
      return { success: true, data: undefined };
    } catch (error) {
      this.registry.updateStatus(id, 'error');
      this.logger.error({ id, error }, 'Extension activation failed');
      return { success: false, error: { code: ErrorCode.INTERNAL, message: `Activation failed: ${error instanceof Error ? error.message : String(error)}`, timestamp: new Date() } };
    }
  }

  async deactivate(id: string): Promise<Result<void>> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };
    if (ext.status !== 'active') return { success: true, data: undefined };

    this.registry.updateStatus(id, 'deactivating');

    try {
      const handler = this.deactivationHandlers.get(id);
      if (handler) await handler();

      this.registry.updateStatus(id, 'inactive');
      this.emitEvent('onDeactivate', id, {});
      this.logger.info({ id }, 'Extension deactivated');
      return { success: true, data: undefined };
    } catch (error) {
      this.registry.updateStatus(id, 'error');
      return { success: false, error: { code: ErrorCode.INTERNAL, message: `Deactivation failed: ${error instanceof Error ? error.message : String(error)}`, timestamp: new Date() } };
    }
  }

  async update(id: string, newManifest: ExtensionManifest): Promise<Result<InstalledExtension>> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };

    const wasActive = ext.status === 'active';
    if (wasActive) await this.deactivate(id);

    this.registry.updateStatus(id, 'updating');

    // Re-register with new manifest
    this.registry.unregister(id);
    const updated = this.registry.register(newManifest, ext.installPath);

    // Re-grant previously granted permissions
    for (const perm of ext.permissions.filter((p) => p.granted)) {
      this.permissions.grant(id, perm.permission);
    }

    if (wasActive) await this.activate(id);

    this.emitEvent('onUpdate', id, { oldVersion: ext.installedVersion, newVersion: newManifest.version });
    this.logger.info({ id, oldVersion: ext.installedVersion, newVersion: newManifest.version }, 'Extension updated');

    return { success: true, data: updated };
  }

  async uninstall(id: string): Promise<Result<void>> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };

    if (ext.status === 'active') await this.deactivate(id);

    this.permissions.revokeAll(id);
    this.registry.unregister(id);
    this.emitEvent('onUninstall', id, {});
    this.logger.info({ id }, 'Extension uninstalled');

    return { success: true, data: undefined };
  }

  async reload(id: string): Promise<Result<void>> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };

    const wasActive = ext.status === 'active';
    if (wasActive) await this.deactivate(id);
    if (wasActive) await this.activate(id);

    this.logger.info({ id }, 'Extension reloaded');
    return { success: true, data: undefined };
  }

  enable(id: string): Result<void> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };
    this.registry.setEnabled(id, true);
    return { success: true, data: undefined };
  }

  disable(id: string): Result<void> {
    const ext = this.registry.get(id);
    if (!ext) return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Extension ${id} not found`, timestamp: new Date() } };
    if (ext.status === 'active') this.deactivate(id);
    this.registry.setEnabled(id, false);
    return { success: true, data: undefined };
  }

  registerActivationHandler(id: string, handler: () => Promise<void>): void {
    this.activationHandlers.set(id, handler);
  }

  registerDeactivationHandler(id: string, handler: () => Promise<void>): void {
    this.deactivationHandlers.set(id, handler);
  }

  getEventHistory(extensionId: string): readonly ExtensionEvent[] {
    return this.eventHistory.filter((e) => e.extensionId === extensionId);
  }

  private emitEvent(name: ExtensionEventName, extensionId: string, data: Record<string, unknown>): void {
    const event: ExtensionEvent = { name, extensionId, data, timestamp: new Date() };
    this.eventHistory.push(event);
    if (this.eventHistory.length > 10_000) this.eventHistory.splice(0, 1000);
  }
}
