/**
 * Tool Registry
 *
 * Central registry for all tools. Dynamic registration, discovery,
 * execution tracking, and permission enforcement.
 */

import type {
  Tool, ToolDefinition, ToolCategory, ToolExecutionContext,
  ToolExecutionResult, ToolExecution, ToolRegistryEntry, ToolRegistryStats,
} from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';
import type { IAuditService } from '../../modules/audit/audit.service.js';
import { ErrorCode, type Result } from '../../types/index.js';

export interface IToolRegistry {
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | null;
  getDefinition(toolId: string): ToolDefinition | null;
  list(category?: ToolCategory): readonly ToolDefinition[];
  execute(toolId: string, input: unknown, context: ToolExecutionContext): Promise<Result<ToolExecutionResult>>;
  getStats(): ToolRegistryStats;
  getExecutionHistory(userId: string, limit?: number): readonly ToolExecution[];
  setEnabled(toolId: string, enabled: boolean): void;
}

export class ToolRegistry implements IToolRegistry {
  private readonly tools = new Map<string, ToolRegistryEntry>();
  private readonly executions: ToolExecution[] = [];
  private readonly activeExecutions = new Map<string, AbortController>();

  constructor(
    private readonly logger: ILogger,
    private readonly audit?: IAuditService,
  ) {}

  register(tool: Tool): void {
    const id = tool.definition.id;
    if (this.tools.has(id)) {
      this.logger.warn({ toolId: id }, 'Tool already registered, replacing');
    }

    this.tools.set(id, {
      tool, registeredAt: new Date(), enabled: true,
      executionCount: 0, lastExecutedAt: null, averageDurationMs: 0, errorRate: 0,
    });

    this.logger.info({ toolId: id, name: tool.definition.name, category: tool.definition.category }, 'Tool registered');
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
    this.logger.info({ toolId }, 'Tool unregistered');
  }

  get(toolId: string): Tool | null {
    return this.tools.get(toolId)?.tool ?? null;
  }

  getDefinition(toolId: string): ToolDefinition | null {
    return this.tools.get(toolId)?.tool.definition ?? null;
  }

  list(category?: ToolCategory): readonly ToolDefinition[] {
    const entries = [...this.tools.values()].filter((e) => e.enabled);
    const filtered = category ? entries.filter((e) => e.tool.definition.category === category) : entries;
    return filtered.map((e) => e.tool.definition);
  }

  async execute(toolId: string, input: unknown, context: ToolExecutionContext): Promise<Result<ToolExecutionResult>> {
    let entry = this.tools.get(toolId);
    if (!entry) {
      return { success: false, error: { code: ErrorCode.NOT_FOUND, message: `Tool ${toolId} not found`, timestamp: new Date() } };
    }

    if (!entry.enabled) {
      return { success: false, error: { code: ErrorCode.FORBIDDEN, message: `Tool ${toolId} is disabled`, timestamp: new Date() } };
    }

    const tool = entry.tool;

    // Validate input
    if (tool.validate) {
      const validation = tool.validate(input);
      if (!validation.valid) {
        return { success: false, error: { code: ErrorCode.VALIDATION, message: `Invalid input: ${validation.errors.join(', ')}`, timestamp: new Date() } };
      }
    }

    // Confirmation check
    if (tool.definition.requiresConfirmation && !context.dryRun) {
      this.logger.warn({ toolId, input }, 'Tool requires confirmation');
    }

    // Execute with timeout and abort support
    const abortController = new AbortController();
    this.activeExecutions.set(context.executionId, abortController);

    const start = performance.now();
    let result: ToolExecutionResult;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('Tool execution timeout')), context.timeout);
        abortController.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Aborted')); });
      });

      result = await Promise.race([
        tool.execute(input, context),
        timeoutPromise,
      ]);

      // Record execution
      const execution: ToolExecution = {
        id: context.executionId, toolId, userId: context.userId,
        organizationId: context.organizationId, conversationId: context.conversationId,
        input, output: result.output, status: result.success ? 'completed' : 'failed',
        error: result.error, durationMs: performance.now() - start,
        metadata: result.metadata, createdAt: new Date(), updatedAt: new Date(),
      };

      this.executions.push(execution);

      // Update stats
      const newCount = entry.executionCount + 1;
      entry = {
        ...entry,
        executionCount: newCount,
        lastExecutedAt: new Date(),
        averageDurationMs: (entry.averageDurationMs * (newCount - 1) + execution.durationMs) / newCount,
        errorRate: (entry.errorRate * (newCount - 1) + (result.success ? 0 : 1)) / newCount,
      };
      this.tools.set(toolId, entry);

      // Audit log
      if (this.audit) {
        await this.audit.log({
          action: `tool.executed.${toolId}`, actorId: context.userId,
          targetId: context.executionId, targetType: 'ToolExecution',
          data: { toolId, success: result.success, durationMs: execution.durationMs },
        });
      }

      return { success: true, data: result };
    } catch (error) {
      const durationMs = performance.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);

      result = {
        executionId: context.executionId, toolId, success: false,
        output: null, error: errorMsg, durationMs, tokensUsed: 0,
        metadata: {}, artifacts: [],
      };

      this.executions.push({
        id: context.executionId, toolId, userId: context.userId,
        organizationId: context.organizationId, conversationId: context.conversationId,
        input, output: null, status: errorMsg.includes('timeout') ? 'timeout' : 'failed',
        error: errorMsg, durationMs, metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      });

      return { success: true, data: result };
    } finally {
      this.activeExecutions.delete(context.executionId);
    }
  }

  getStats(): ToolRegistryStats {
    const byCategory: Record<ToolCategory, number> = {
      filesystem: 0, shell: 0, git: 0, search: 0, browser: 0, mcp: 0, docker: 0,
    };

    for (const entry of this.tools.values()) {
      if (entry.enabled) byCategory[entry.tool.definition.category]++;
    }

    return {
      totalTools: this.tools.size,
      enabledTools: [...this.tools.values()].filter((e) => e.enabled).length,
      totalExecutions: this.executions.length,
      byCategory,
    };
  }

  getExecutionHistory(userId: string, limit = 50): readonly ToolExecution[] {
    return this.executions
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  setEnabled(toolId: string, enabled: boolean): void {
    const entry = this.tools.get(toolId);
    if (entry) {
      this.tools.set(toolId, { ...entry, enabled });
      this.logger.info({ toolId, enabled }, `Tool ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}
