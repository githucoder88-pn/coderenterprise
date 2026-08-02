/**
 * Git Tools
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { GitStatusSchema, GitCommitSchema, GitBranchSchema, GitDiffSchema } from '../types.js';

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('git', args, { cwd, timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
}

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'git', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts: [] };
}

export class GitStatusTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.status', name: 'Git Status', category: 'git', description: 'Get repository status',
    inputSchema: {}, outputSchema: {}, permissions: ['git:read'], timeout: 10_000,
    requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = GitStatusSchema.parse(input);
    const { stdout } = await git(['status', '--porcelain', '-b'], parsed.path);
    const lines = stdout.trim().split('\n').filter(Boolean);
    const files = lines.slice(1).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3) }));
    return makeResult(ctx, true, { branch: lines[0]?.replace('## ', ''), files, clean: files.length === 0 });
  }
}

export class GitCommitTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.commit', name: 'Git Commit', category: 'git', description: 'Create a commit',
    inputSchema: {}, outputSchema: {}, permissions: ['git:write'], timeout: 10_000,
    requiresConfirmation: true, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = GitCommitSchema.parse(input);
    const cwd = ctx.workingDirectory;
    if (parsed.files?.length) await git(['add', ...parsed.files], cwd);
    if (parsed.all) await git(['add', '-A'], cwd);
    const args = ['commit', '-m', parsed.message];
    if (parsed.amend) args.push('--amend');
    const { stdout } = await git(args, cwd);
    const hash = (await git(['rev-parse', 'HEAD'], cwd)).stdout.trim();
    return makeResult(ctx, true, { hash, message: parsed.message, output: stdout.trim() });
  }
}

export class GitBranchTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.branch', name: 'Git Branch', category: 'git', description: 'Create or list branches',
    inputSchema: {}, outputSchema: {}, permissions: ['git:write'], timeout: 10_000,
    requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = GitBranchSchema.parse(input);
    const cwd = ctx.workingDirectory;
    if (parsed.name) {
      const args = ['branch', parsed.name];
      if (parsed.startPoint) args.push(parsed.startPoint);
      await git(args, cwd);
      if (parsed.checkout) await git(['checkout', parsed.name], cwd);
      return makeResult(ctx, true, { branch: parsed.name, checkedOut: parsed.checkout });
    }
    const { stdout } = await git(['branch', '-a'], cwd);
    const branches = stdout.trim().split('\n').filter(Boolean).map((b) => b.trim().replace('* ', ''));
    return makeResult(ctx, true, { branches });
  }
}

export class GitCheckoutTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.checkout', name: 'Git Checkout', category: 'git', description: 'Checkout a branch',
    inputSchema: {}, outputSchema: {}, permissions: ['git:write'], timeout: 10_000,
    requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { branch, create } = (input ?? {}) as { branch: string; create?: boolean };
    const args = create ? ['checkout', '-b', branch] : ['checkout', branch];
    const { stdout } = await git(args, ctx.workingDirectory);
    return makeResult(ctx, true, { branch, output: stdout.trim() });
  }
}

export class GitDiffTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.diff', name: 'Git Diff', category: 'git', description: 'Show diffs',
    inputSchema: {}, outputSchema: {}, permissions: ['git:read'], timeout: 10_000,
    requiresConfirmation: false, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = GitDiffSchema.parse(input);
    const args = ['diff'];
    if (parsed.staged) args.push('--staged');
    if (parsed.commit) args.push(parsed.commit);
    if (parsed.files?.length) args.push('--', ...parsed.files);
    const { stdout } = await git(args, ctx.workingDirectory);
    return makeResult(ctx, true, { diff: stdout });
  }
}

export class GitMergeTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'git.merge', name: 'Git Merge', category: 'git', description: 'Merge a branch',
    inputSchema: {}, outputSchema: {}, permissions: ['git:write'], timeout: 10_000,
    requiresConfirmation: true, dangerous: false, metadata: {},
  };
  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { branch, noFf } = (input ?? {}) as { branch: string; noFf?: boolean };
    const args = ['merge'];
    if (noFf) args.push('--no-ff');
    args.push(branch);
    const { stdout } = await git(args, ctx.workingDirectory);
    return makeResult(ctx, true, { branch, output: stdout.trim() });
  }
}

export const GIT_TOOLS = [
  new GitStatusTool(), new GitCommitTool(), new GitBranchTool(),
  new GitCheckoutTool(), new GitDiffTool(), new GitMergeTool(),
];
