/**
 * Search Tools
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { SearchSchema, GlobSchema } from '../types.js';

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'search', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts: [] };
}

export class SearchTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'search.search', name: 'Search Files', category: 'search',
    description: 'Search for text patterns in files',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
    outputSchema: { type: 'array' }, permissions: ['search:read'],
    timeout: 30_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = SearchSchema.parse(input);
    const results: { file: string; line: number; match: string }[] = [];
    const query = parsed.caseSensitive ? parsed.query : parsed.query.toLowerCase();

    for (const searchPath of parsed.paths) {
      const fullPath = join(ctx.workingDirectory, searchPath);
      await this.searchDir(fullPath, query, parsed, results, ctx.workingDirectory, 0);
      if (results.length >= parsed.maxResults) break;
    }

    return makeResult(ctx, true, { results: results.slice(0, parsed.maxResults), totalMatches: results.length });
  }

  private async searchDir(
    dir: string, query: string, parsed: any,
    results: { file: string; line: number; match: string }[],
    root: string, depth: number,
  ): Promise<void> {
    if (depth > 10 || results.length >= parsed.maxResults) return;
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= parsed.maxResults) return;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (parsed.exclude && entry.name.match(parsed.exclude)) continue;
        if (parsed.include && !entry.name.match(parsed.include)) continue;

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.searchDir(fullPath, query, parsed, results, root, depth + 1);
        } else if (entry.isFile()) {
          try {
            const content = await readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i] ?? '';
              const searchable = parsed.caseSensitive ? line : line.toLowerCase();
              if (searchable.includes(query)) {
                results.push({ file: relative(root, fullPath), line: i + 1, match: line.trim() });
                if (results.length >= parsed.maxResults) return;
              }
            }
          } catch { /* skip binary/unreadable files */ }
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }
}

export class GlobTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'search.glob', name: 'Glob Search', category: 'search',
    description: 'Find files matching a glob pattern',
    inputSchema: { type: 'object', properties: { pattern: { type: 'string' } } },
    outputSchema: { type: 'array' }, permissions: ['search:read'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = GlobSchema.parse(input);
    const root = join(ctx.workingDirectory, parsed.cwd);
    const results: string[] = [];
    const regex = this.globToRegex(parsed.pattern);

    await this.findFiles(root, regex, parsed.ignore, results, root, parsed.maxResults, 0);
    return makeResult(ctx, true, { files: results, totalMatches: results.length });
  }

  private async findFiles(
    dir: string, pattern: RegExp, ignore: string[],
    results: string[], root: string, max: number, depth: number,
  ): Promise<void> {
    if (depth > 15 || results.length >= max) return;
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= max) return;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (ignore.some((p) => entry.name.match(p))) continue;

        const fullPath = join(dir, entry.name);
        const relPath = relative(root, fullPath);

        if (pattern.test(relPath) || pattern.test(entry.name)) {
          results.push(relPath);
        }
        if (entry.isDirectory()) {
          await this.findFiles(fullPath, pattern, ignore, results, root, max, depth + 1);
        }
      }
    } catch { /* skip */ }
  }

  private globToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '⟨GLOBSTAR⟩')
      .replace(/\*/g, '[^/]*')
      .replace(/⟨GLOBSTAR⟩/g, '.*')
      .replace(/\?/g, '[^/]');
    return new RegExp(`^${escaped}$`, 'i');
  }
}

export const SEARCH_TOOLS = [new SearchTool(), new GlobTool()];
