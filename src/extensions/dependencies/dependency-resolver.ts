/**
 * Dependency Resolver
 *
 * Resolves extension dependencies, detects conflicts, validates version ranges.
 */

import type { ExtensionDependency, ResolvedDependency } from '../types.js';
import type { ExtensionRegistry } from '../registry/extension-registry.js';
import type { ILogger } from '../../telemetry/logger.js';

export interface IDependencyResolver {
  resolve(dependencies: readonly ExtensionDependency[]): readonly ResolvedDependency[];
  validate(manifestId: string, dependencies: readonly ExtensionDependency[]): { valid: boolean; errors: readonly string[] };
  getDependencyTree(extensionId: string): readonly { id: string; version: string; depth: number }[];
  detectCircular(dependencies: readonly ExtensionDependency[]): readonly string[];
}

export class DependencyResolver implements IDependencyResolver {
  constructor(
    private readonly registry: ExtensionRegistry,
    private readonly logger: ILogger,
  ) {}

  resolve(dependencies: readonly ExtensionDependency[]): readonly ResolvedDependency[] {
    return dependencies.map((dep) => {
      const installed = this.registry.get(dep.id);
      if (!installed) {
        return { id: dep.id, version: dep.version, resolved: false, conflictWith: null };
      }

      const satisfies = this.satisfiesVersion(installed.installedVersion, dep.version);
      return {
        id: dep.id,
        version: installed.installedVersion,
        resolved: satisfies,
        conflictWith: satisfies ? null : `${dep.id}@${installed.installedVersion} (requires ${dep.version})`,
      };
    });
  }

  validate(manifestId: string, dependencies: readonly ExtensionDependency[]): { valid: boolean; errors: readonly string[] } {
    const errors: string[] = [];
    const resolved = this.resolve(dependencies);

    for (const dep of resolved) {
      if (!dep.resolved && !dependencies.find((d) => d.id === dep.id)?.optional) {
        errors.push(`Missing or incompatible dependency: ${dep.id}@${dep.version}`);
      }
      if (dep.conflictWith) {
        errors.push(`Version conflict: ${dep.conflictWith}`);
      }
    }

    // Check circular dependencies
    const circular = this.detectCircular(dependencies);
    if (circular.length > 0) {
      errors.push(`Circular dependencies detected: ${circular.join(' → ')}`);
    }

    // Self-dependency check
    if (dependencies.some((d) => d.id === manifestId)) {
      errors.push('Extension cannot depend on itself');
    }

    return { valid: errors.length === 0, errors };
  }

  getDependencyTree(extensionId: string): readonly { id: string; version: string; depth: number }[] {
    const visited = new Set<string>();
    const tree: { id: string; version: string; depth: number }[] = [];

    const traverse = (id: string, depth: number) => {
      if (visited.has(id) || depth > 10) return;
      visited.add(id);

      const ext = this.registry.get(id);
      if (!ext) return;

      tree.push({ id, version: ext.installedVersion, depth });

      for (const dep of ext.manifest.dependencies) {
        traverse(dep.id, depth + 1);
      }
    };

    traverse(extensionId, 0);
    return tree;
  }

  detectCircular(dependencies: readonly ExtensionDependency[]): readonly string[] {
    const graph = new Map<string, string[]>();
    for (const dep of dependencies) {
      const ext = this.registry.get(dep.id);
      if (ext) {
        graph.set(dep.id, ext.manifest.dependencies.map((d) => d.id));
      }
    }

    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (path.includes(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      path.push(node);
      for (const neighbor of graph.get(node) ?? []) {
        if (dfs(neighbor)) return true;
      }
      path.pop();
      return false;
    };

    for (const node of graph.keys()) {
      if (dfs(node)) return [...path];
    }

    return [];
  }

  satisfiesVersion(installed: string, required: string): boolean {
    // Simple semver check: exact match or compatible
    if (required === '*' || required === `>=${installed}`) return true;
    if (required.startsWith('>=')) {
      return this.compareVersions(installed, required.slice(2)) >= 0;
    }
    if (required.startsWith('^')) {
      const req = required.slice(1);
      return this.getMajor(installed) === this.getMajor(req) && this.compareVersions(installed, req) >= 0;
    }
    if (required.startsWith('~')) {
      const req = required.slice(1);
      return this.getMajor(installed) === this.getMajor(req) && this.getMinor(installed) === this.getMinor(req);
    }
    return installed === required;
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

  private getMajor(v: string): number { return parseInt(v.split('.')[0] ?? '0', 10); }
  private getMinor(v: string): number { return parseInt(v.split('.')[1] ?? '0', 10); }
}
