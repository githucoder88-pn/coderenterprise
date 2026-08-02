/**
 * MCP (Model Context Protocol) Tools
 */

import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult, McpServerConfig, McpToolDefinition } from '../types.js';
import type { ILogger } from '../../telemetry/logger.js';

function makeResult(ctx: ToolExecutionContext, success: boolean, output: unknown, error: string | null = null): ToolExecutionResult {
  return { executionId: ctx.executionId, toolId: 'mcp', success, output, error, durationMs: 0, tokensUsed: 0, metadata: {}, artifacts: [] };
}

export class McpDiscoveryTool implements Tool {
  private readonly servers = new Map<string, McpServerConfig>();

  readonly definition: ToolDefinition = {
    id: 'mcp.discovery', name: 'MCP Discovery', category: 'mcp',
    description: 'Discover tools from MCP servers',
    inputSchema: {}, outputSchema: {}, permissions: ['mcp:read'],
    timeout: 15_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  constructor(private readonly logger: ILogger) {}

  registerServer(config: McpServerConfig): void {
    this.servers.set(config.id, config);
    this.logger.info({ serverId: config.id, name: config.name }, 'MCP server registered');
  }

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const serverId = (input as any)?.serverId as string | undefined;
    if (serverId) {
      const server = this.servers.get(serverId);
      if (!server) return makeResult(ctx, false, null, `MCP server ${serverId} not found`);
      return makeResult(ctx, true, { server: { id: server.id, name: server.name, transport: server.transport } });
    }
    return makeResult(ctx, true, {
      servers: [...this.servers.values()].map((s) => ({ id: s.id, name: s.name, transport: s.transport })),
    });
  }
}

export class McpExecuteTool implements Tool {
  readonly definition: ToolDefinition = {
    id: 'mcp.execute', name: 'Execute MCP Tool', category: 'mcp',
    description: 'Execute a tool on an MCP server',
    inputSchema: {}, outputSchema: {}, permissions: ['mcp:execute'],
    timeout: 60_000, requiresConfirmation: false, dangerous: false, metadata: {},
  };

  constructor(private readonly logger: ILogger) {}

  async execute(input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { serverId, toolName, input: toolInput } = input as { serverId: string; toolName: string; input: Record<string, unknown> };
    this.logger.info({ serverId, toolName, executionId: ctx.executionId }, 'MCP tool execution');
    // In production, connect to MCP server via stdio/SSE and invoke tool
    return makeResult(ctx, true, { serverId, toolName, input: toolInput, note: 'MCP execution requires server connection' });
  }
}

export const MCP_TOOLS = [];
export function createMcpTools(logger: ILogger): Tool[] {
  return [new McpDiscoveryTool(logger), new McpExecuteTool(logger)];
}
