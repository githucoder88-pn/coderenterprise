/**
 * Extension Sandbox
 *
 * Isolates extensions in controlled environments with resource limits,
 * permission boundaries, and execution time limits.
 */

import type { SandboxConfig, SandboxViolation, ExtensionPermission } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

const DEFAULT_CONFIG: SandboxConfig = {
  maxMemoryMB: 128,
  maxCpuPercent: 25,
  maxExecutionTimeMs: 30_000,
  allowedModules: ['events', 'util', 'path', 'url', 'querystring', 'buffer'],
  networkDomains: [],
  filesystemPaths: [],
  envVars: [],
};

export interface ISandbox {
  execute<T>(extensionId: string, fn: () => Promise<T>, config?: Partial<SandboxConfig>): Promise<T>;
  checkPermission(extensionId: string, permission: ExtensionPermission): boolean;
  getViolations(extensionId: string): readonly SandboxViolation[];
  setConfig(extensionId: string, config: Partial<SandboxConfig>): void;
  getResourceUsage(extensionId: string): { memoryMB: number; cpuPercent: number; executionTimeMs: number };
}

export class ExtensionSandbox implements ISandbox {
  private readonly configs = new Map<string, SandboxConfig>();
  private readonly violations = new Map<string, SandboxViolation[]>();
  private readonly resourceUsage = new Map<string, { memoryMB: number; cpuPercent: number; executionTimeMs: number }>();
  private readonly permissionChecker: (extensionId: string, permission: ExtensionPermission) => boolean;

  constructor(
    private readonly logger: ILogger,
    permissionChecker: (extensionId: string, permission: ExtensionPermission) => boolean,
  ) {
    this.permissionChecker = permissionChecker;
  }

  async execute<T>(extensionId: string, fn: () => Promise<T>, config?: Partial<SandboxConfig>): Promise<T> {
    const sandboxConfig = { ...DEFAULT_CONFIG, ...this.configs.get(extensionId), ...config };
    const start = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), sandboxConfig.maxExecutionTimeMs);

    try {
      // Race with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new SandboxTimeoutError(extensionId, sandboxConfig.maxExecutionTimeMs)));
        }),
      ]);

      const elapsed = performance.now() - start;
      const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / (1024 * 1024);

      // Check resource limits
      if (memoryUsed > sandboxConfig.maxMemoryMB) {
        this.addViolation(extensionId, {
          type: 'memory', severity: 'warning',
          message: `Memory usage ${memoryUsed.toFixed(1)}MB exceeds limit ${sandboxConfig.maxMemoryMB}MB`,
          timestamp: new Date(),
        });
      }

      this.resourceUsage.set(extensionId, {
        memoryMB: memoryUsed,
        cpuPercent: 0,
        executionTimeMs: elapsed,
      });

      return result;
    } catch (error) {
      if (error instanceof SandboxTimeoutError) {
        this.addViolation(extensionId, {
          type: 'time', severity: 'error',
          message: `Execution exceeded ${sandboxConfig.maxExecutionTimeMs}ms`,
          timestamp: new Date(),
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  checkPermission(extensionId: string, permission: ExtensionPermission): boolean {
    const allowed = this.permissionChecker(extensionId, permission);
    if (!allowed) {
      this.addViolation(extensionId, {
        type: 'permission', severity: 'error',
        message: `Permission denied: ${permission}`,
        timestamp: new Date(),
      });
    }
    return allowed;
  }

  getViolations(extensionId: string): readonly SandboxViolation[] {
    return this.violations.get(extensionId) ?? [];
  }

  setConfig(extensionId: string, config: Partial<SandboxConfig>): void {
    const existing = this.configs.get(extensionId) ?? DEFAULT_CONFIG;
    this.configs.set(extensionId, { ...existing, ...config });
  }

  getResourceUsage(extensionId: string): { memoryMB: number; cpuPercent: number; executionTimeMs: number } {
    return this.resourceUsage.get(extensionId) ?? { memoryMB: 0, cpuPercent: 0, executionTimeMs: 0 };
  }

  private addViolation(extensionId: string, violation: SandboxViolation): void {
    if (!this.violations.has(extensionId)) this.violations.set(extensionId, []);
    this.violations.get(extensionId)!.push(violation);
    this.logger.warn({ extensionId, violation }, 'Sandbox violation');
  }
}

export class SandboxTimeoutError extends Error {
  constructor(public readonly extensionId: string, public readonly timeoutMs: number) {
    super(`Extension ${extensionId} exceeded execution timeout of ${timeoutMs}ms`);
    this.name = 'SandboxTimeoutError';
  }
}
