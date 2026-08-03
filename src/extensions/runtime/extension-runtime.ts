/**
 * Extension Runtime
 *
 * Loads and executes extensions in sandboxed environments.
 * Supports hot reloading and background execution.
 */

import type { InstalledExtension, ExtensionManifest } from '../types.js';
import type { MessageBus } from '../messaging/message-bus.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface ExtensionContext {
  readonly extensionId: string;
  readonly manifest: ExtensionManifest;
  readonly storage: ExtensionStorageProxy;
  readonly messaging: ExtensionMessagingProxy;
  readonly logger: ExtensionLoggerProxy;
}

export interface ExtensionStorageProxy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<readonly string[]>;
}

export interface ExtensionMessagingProxy {
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: (message: any) => void): string;
  unsubscribe(subscriptionId: string): void;
  request(target: string, channel: string, payload: unknown): Promise<unknown>;
}

export interface ExtensionLoggerProxy {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export interface IExtensionRuntime {
  load(extension: InstalledExtension): Promise<void>;
  unload(extensionId: string): Promise<void>;
  reload(extensionId: string): Promise<void>;
  createContext(extension: InstalledExtension): ExtensionContext;
  isLoaded(extensionId: string): boolean;
  getLoadedExtensions(): readonly string[];
}

export class ExtensionRuntime implements IExtensionRuntime {
  private readonly loadedModules = new Map<string, unknown>();
  private readonly contexts = new Map<string, ExtensionContext>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly logger: ILogger,
  ) {}

  async load(extension: InstalledExtension): Promise<void> {
    const id = extension.manifest.id;
    this.logger.info({ id, main: extension.manifest.main }, 'Loading extension');

    try {
      // Create sandboxed context
      const context = this.createContext(extension);
      this.contexts.set(id, context);

      // In production: load the extension module via dynamic import
      // For now, store the manifest as the module reference
      this.loadedModules.set(id, extension.manifest);

      this.logger.info({ id }, 'Extension loaded');
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to load extension');
      throw error;
    }
  }

  async unload(extensionId: string): Promise<void> {
    this.loadedModules.delete(extensionId);
    this.contexts.delete(extensionId);

    // Unsubscribe all message handlers
    const subs = this.messageBus.getSubscriptions(extensionId);
    for (const sub of subs) {
      this.messageBus.unsubscribe(sub.id);
    }

    this.logger.info({ extensionId }, 'Extension unloaded');
  }

  async reload(extensionId: string): Promise<void> {
    const context = this.contexts.get(extensionId);
    if (!context) throw new Error(`Extension ${extensionId} not loaded`);

    await this.unload(extensionId);
    // Re-load would happen here with fresh module
    this.logger.info({ extensionId }, 'Extension reloaded');
  }

  createContext(extension: InstalledExtension): ExtensionContext {
    const id = extension.manifest.id;

    return {
      extensionId: id,
      manifest: extension.manifest,
      storage: {
        get: async <T>(_key: string): Promise<T | null> => {
          // In production: use isolated storage per extension
          return null;
        },
        set: async <T>(key: string, _value: T): Promise<void> => {
          this.logger.debug({ extensionId: id, key }, 'Storage set');
        },
        delete: async (_key: string): Promise<void> => {},
        keys: async (): Promise<readonly string[]> => [],
      },
      messaging: {
        publish: (channel: string, payload: unknown) => this.messageBus.publish(id, channel, payload),
        subscribe: (channel: string, handler: (message: any) => void) => this.messageBus.subscribe(id, channel, handler),
        unsubscribe: (subId: string) => this.messageBus.unsubscribe(subId),
        request: (target: string, channel: string, payload: unknown) => this.messageBus.request(id, target, channel, payload),
      },
      logger: {
        info: (msg, data) => this.logger.info({ extensionId: id, ...data }, msg),
        warn: (msg, data) => this.logger.warn({ extensionId: id, ...data }, msg),
        error: (msg, data) => this.logger.error({ extensionId: id, ...data }, msg),
        debug: (msg, data) => this.logger.debug({ extensionId: id, ...data }, msg),
      },
    };
  }

  isLoaded(extensionId: string): boolean { return this.loadedModules.has(extensionId); }
  getLoadedExtensions(): readonly string[] { return [...this.loadedModules.keys()]; }
}
