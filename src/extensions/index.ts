/**
 * Extension Platform — Module Index
 */

export * from './types.js';
export { ExtensionRegistry, type IExtensionRegistry } from './registry/extension-registry.js';
export { ExtensionLifecycleManager, type IExtensionLifecycleManager } from './lifecycle/extension-lifecycle.js';
export { PermissionManager, type IPermissionManager } from './permissions/permission-manager.js';
export { DependencyResolver, type IDependencyResolver } from './dependencies/dependency-resolver.js';
export { ExtensionSandbox, SandboxTimeoutError, type ISandbox } from './sandbox/extension-sandbox.js';
export { MessageBus, type IMessageBus } from './messaging/message-bus.js';
export { ExtensionRuntime, type IExtensionRuntime, type ExtensionContext } from './runtime/extension-runtime.js';
export { ExtensionMarketplace, type IExtensionMarketplace } from './marketplace/extension-marketplace.js';
export { ExtensionStorage, type IExtensionStorage } from './storage/extension-storage.js';
