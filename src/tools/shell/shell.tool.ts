/**
 * Shell / Terminal Tools
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { ExecuteCommandSchema } from '../types.js';

export class ExecuteCommandTool implements Tool {
  private readonly processes = new Map<string, ChildProcess>();

  readonly definition: ToolDefinition = {
    id: 'shell.execute', name: 'Execute Command', category: 'shell',
    description: 'Execute a shell command',
    inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['shell:execute'],
    timeout: 30_000, requiresConfirmation: true, dangerous: true, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = ExecuteCommandSchema.parse(input);
    const start = performance.now();

    return new Promise((resolve) => {
      const proc = spawn(parsed.command, parsed.args, {
        cwd: parsed.cwd ?? ctx.workingDirectory,
        env: { ...process.env, ...ctx.environment, ...parsed.env },
        shell: true,
        timeout: parsed.timeout,
      });

      this.processes.set(ctx.executionId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      if (parsed.stdin) {
        proc.stdin?.write(parsed.stdin);
        proc.stdin?.end();
      }

      proc.on('close', (code) => {
        this.processes.delete(ctx.executionId);
        resolve({
          executionId: ctx.executionId, toolId: 'shell.execute',
          success: code === 0,
          output: { stdout: stdout.slice(0, 100_000), stderr: stderr.slice(0, 50_000), exitCode: code },
          error: code !== 0 ? `Process exited with code ${code}: ${stderr.slice(0, 1000)}` : null,
          durationMs: performance.now() - start, tokensUsed: 0, metadata: {}, artifacts: [],
        });
      });

      proc.on('error', (error) => {
        this.processes.delete(ctx.executionId);
        resolve({
          executionId: ctx.executionId, toolId: 'shell.execute',
          success: false, output: null, error: error.message,
          durationMs: performance.now() - start, tokensUsed: 0, metadata: {}, artifacts: [],
        });
      });
    });
  }

  abort(executionId: string): void {
    const proc = this.processes.get(executionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(executionId);
    }
  }
}

export class SpawnProcessTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'shell.spawn', name: 'Spawn Process', category: 'shell',
    description: 'Spawn a long-running process',
    inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
    outputSchema: { type: 'object' }, permissions: ['shell:execute'],
    timeout: 300_000, requiresConfirmation: true, dangerous: true, metadata: {},
  };

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const parsed = ExecuteCommandSchema.parse(input);
    const proc = spawn(parsed.command, parsed.args, {
      cwd: parsed.cwd ?? ctx.workingDirectory,
      env: { ...process.env, ...ctx.environment, ...parsed.env },
      shell: true, detached: true, stdio: 'ignore',
    });
    proc.unref();
    return {
      executionId: ctx.executionId, toolId: 'shell.spawn', success: true,
      output: { pid: proc.pid, command: parsed.command }, error: null,
      durationMs: 0, tokensUsed: 0, metadata: { pid: proc.pid }, artifacts: [],
    };
  }
}

export const SHELL_TOOLS = [new ExecuteCommandTool(), new SpawnProcessTool()];
