/**
 * Extension Platform — Core Types
 *
 * Fully typed extension ecosystem definitions.
 */

import { z } from 'zod';
import type { Timestamps } from '../types/index.js';

// ─── Extension Types ─────────────────────────────────────────────────────────

export type ExtensionKind =
  | 'theme' | 'tool' | 'provider' | 'model' | 'agent'
  | 'workflow' | 'ui' | 'mcp' | 'auth' | 'notification';

export type ExtensionStatus =
  | 'available' | 'installing' | 'installed' | 'activating'
  | 'active' | 'deactivating' | 'inactive' | 'updating'
  | 'uninstalling' | 'error' | 'disabled';

// ─── Manifest ────────────────────────────────────────────────────────────────

export interface ExtensionManifest {
  readonly id: string;
  readonly name: string;
  readonly publisher: string;
  readonly version: string;
  readonly description: string;
  readonly kind: ExtensionKind;
  readonly main: string;
  readonly icon: string | null;
  readonly license: string;
  readonly homepage: string | null;
  readonly repository: string | null;
  readonly permissions: readonly ExtensionPermission[];
  readonly dependencies: readonly ExtensionDependency[];
  readonly activationEvents: readonly string[];
  readonly contributes: ExtensionContributions;
  readonly engines: { readonly coder: string };
  readonly keywords: readonly string[];
  readonly categories: readonly string[];
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type ExtensionPermission =
  | 'filesystem.read' | 'filesystem.write'
  | 'terminal.execute'
  | 'network.access'
  | 'workspace.access'
  | 'provider.access'
  | 'memory.access'
  | 'storage.access'
  | 'agent.access'
  | 'notification.send'
  | 'ui.contribute';

export interface PermissionGrant {
  readonly permission: ExtensionPermission;
  readonly granted: boolean;
  readonly reason: string;
  readonly grantedAt: Date | null;
  readonly revokedAt: Date | null;
}

// ─── Dependencies ────────────────────────────────────────────────────────────

export interface ExtensionDependency {
  readonly id: string;
  readonly version: string; // semver range
  readonly optional: boolean;
}

export interface ResolvedDependency {
  readonly id: string;
  readonly version: string;
  readonly resolved: boolean;
  readonly conflictWith: string | null;
}

// ─── Contributions ───────────────────────────────────────────────────────────

export interface ExtensionContributions {
  readonly commands?: readonly { readonly command: string; readonly title: string; readonly category?: string }[];
  readonly menus?: readonly { readonly group: string; readonly command: string; readonly when?: string }[];
  readonly themes?: readonly { readonly id: string; readonly label: string; readonly path: string }[];
  readonly tools?: readonly { readonly id: string; readonly name: string; readonly description: string }[];
  readonly providers?: readonly { readonly id: string; readonly name: string }[];
  readonly languages?: readonly { readonly id: string; readonly extensions: readonly string[] }[];
  readonly keybindings?: readonly { readonly key: string; readonly command: string; readonly when?: string }[];
}

// ─── Installed Extension ─────────────────────────────────────────────────────

export interface InstalledExtension extends Timestamps {
  readonly id: string;
  readonly manifest: ExtensionManifest;
  readonly status: ExtensionStatus;
  readonly installPath: string;
  readonly installedVersion: string;
  readonly enabled: boolean;
  readonly permissions: readonly PermissionGrant[];
  readonly settings: Record<string, unknown>;
  readonly lastActivatedAt: Date | null;
  readonly lastError: string | null;
  readonly metadata: Record<string, unknown>;
}

// ─── Marketplace ─────────────────────────────────────────────────────────────

export interface MarketplaceExtension extends Timestamps {
  readonly id: string;
  readonly manifest: ExtensionManifest;
  readonly publisher: Publisher;
  readonly downloadCount: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly verified: boolean;
  readonly featured: boolean;
  readonly categories: readonly string[];
  readonly screenshots: readonly string[];
  readonly changelog: string;
  readonly pricing: { readonly type: 'free' | 'paid'; readonly price: number } | null;
}

export interface Publisher {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly verified: boolean;
  readonly extensionCount: number;
  readonly joinedAt: Date;
}

export interface ExtensionReview extends Timestamps {
  readonly id: string;
  readonly extensionId: string;
  readonly userId: string;
  readonly rating: number; // 1-5
  readonly title: string;
  readonly body: string;
  readonly helpful: number;
}

// ─── Sandbox ─────────────────────────────────────────────────────────────────

export interface SandboxConfig {
  readonly maxMemoryMB: number;
  readonly maxCpuPercent: number;
  readonly maxExecutionTimeMs: number;
  readonly allowedModules: readonly string[];
  readonly networkDomains: readonly string[];
  readonly filesystemPaths: readonly string[];
  readonly envVars: readonly string[];
}

export interface SandboxViolation {
  readonly type: 'memory' | 'cpu' | 'time' | 'network' | 'filesystem' | 'permission' | 'module';
  readonly message: string;
  readonly severity: 'warning' | 'error' | 'critical';
  readonly timestamp: Date;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface ExtensionMessage {
  readonly id: string;
  readonly from: string; // extension id or 'core'
  readonly to: string;   // extension id or 'core' or '*'
  readonly channel: string;
  readonly payload: unknown;
  readonly timestamp: Date;
  readonly replyTo: string | null;
}

export interface MessageSubscription {
  readonly id: string;
  readonly extensionId: string;
  readonly channel: string;
  readonly handler: string; // handler function name
  readonly active: boolean;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type ExtensionEventName =
  | 'onInstall' | 'onActivate' | 'onDeactivate' | 'onUninstall' | 'onUpdate'
  | 'onWorkspaceOpen' | 'onWorkspaceClose'
  | 'onConversationStart' | 'onConversationEnd'
  | 'onMessageSent' | 'onMessageReceived'
  | 'onModelChange' | 'onProviderChange'
  | 'onToolExecution' | 'onFileChange'
  | 'onSettingsChange' | 'onThemeChange';

export interface ExtensionEvent {
  readonly name: ExtensionEventName;
  readonly extensionId: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: Date;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ExtensionManifestSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  publisher: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  kind: z.enum(['theme', 'tool', 'provider', 'model', 'agent', 'workflow', 'ui', 'mcp', 'auth', 'notification']),
  main: z.string().min(1),
  icon: z.string().nullable().default(null),
  license: z.string().default('MIT'),
  homepage: z.string().url().nullable().default(null),
  repository: z.string().url().nullable().default(null),
  permissions: z.array(z.string()).default([]),
  dependencies: z.array(z.object({ id: z.string(), version: z.string(), optional: z.boolean().default(false) })).default([]),
  activationEvents: z.array(z.string()).default(['*']),
  contributes: z.object({
    commands: z.array(z.object({ command: z.string(), title: z.string(), category: z.string().optional() })).optional(),
    menus: z.array(z.object({ group: z.string(), command: z.string(), when: z.string().optional() })).optional(),
    themes: z.array(z.object({ id: z.string(), label: z.string(), path: z.string() })).optional(),
    tools: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })).optional(),
    providers: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    languages: z.array(z.object({ id: z.string(), extensions: z.array(z.string()) })).optional(),
    keybindings: z.array(z.object({ key: z.string(), command: z.string(), when: z.string().optional() })).optional(),
  }).default({}),
  engines: z.object({ coder: z.string() }),
  keywords: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
});

export const InstallExtensionSchema = z.object({
  extensionId: z.string().min(1),
  version: z.string().optional(),
  force: z.boolean().default(false),
});
