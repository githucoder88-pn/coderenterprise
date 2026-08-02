/**
 * Docker Tools
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { DockerRunSchema } from '../types.js';

const execFileAsync = promisify(execFile);

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'docker', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts: [] };
}

export class DockerRunTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'docker.run', name: 'Docker Run', category: 'docker',
    description: 'Run a Docker container',
    inputSchema: {}, outputSchema: {}, permissions: ['docker:run'],
    timeout: 120_000, requiresConfirmation: true, dangerous: true, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = DockerRunSchema.parse(input);
    const args = ['run'];
    if (parsed.remove) args.push('--rm');
    for (const e of Object.entries(parsed.env)) args.push('-e', `${e[0]}=${e[1]}`);
    for (const p of parsed.ports) args.push('-p', p);
    for (const v of parsed.volumes) args.push('-v', v);
    if (parsed.workingDir) args.push('-w', parsed.workingDir);
    args.push(parsed.image);
    if (parsed.command) args.push(parsed.command);
    args.push(...parsed.args);

    try {
      const { stdout, stderr } = await execFileAsync('docker', args, { timeout: parsed.timeout, maxBuffer: 50 * 1024 * 1024 });
      return makeResult(ctx, true, { stdout: stdout.slice(0, 100_000), stderr: stderr.slice(0, 10_000), image: parsed.image });
    } catch (error: any) {
      return makeResult(ctx, false, null, error.message);
    }
  }
}

export class DockerPsTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'docker.ps', name: 'Docker PS', category: 'docker',
    description: 'List running containers',
    inputSchema: {}, outputSchema: {}, permissions: ['docker:read'],
    timeout: 10_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  async execute(_input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { stdout } = await execFileAsync('docker', ['ps', '--format', 'json'], { timeout: 10_000 });
    const containers = stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    return makeResult(ctx, true, { containers });
  }
}

export const DOCKER_TOOLS = [new DockerRunTool(), new DockerPsTool()];
