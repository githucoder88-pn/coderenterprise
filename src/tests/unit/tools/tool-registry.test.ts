/**
 * Tool Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from '../../../tools/registry/tool-registry.js';
import type { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../../../tools/types.js';
import { createMockLogger } from '../../helpers.js';

function createMockTool(overrides?: Partial<ToolDefinition>): Tool {
  const definition: ToolDefinition = {
    id: 'test.tool', name: 'Test Tool', category: 'filesystem',
    description: 'A test tool', inputSchema: {}, outputSchema: {},
    permissions: [], timeout: 5000, requiresConfirmation: false,
    dangerous: false, metadata: {}, ...overrides,
  };
  return {
    definition,
    execute: vi.fn(async (_input: unknown, ctx: ToolExecutionContext): Promise<ToolExecutionResult> => ({
      executionId: ctx.executionId, toolId: definition.id, success: true,
      output: { result: 'ok' }, error: null, durationMs: 10, tokensUsed: 0,
      metadata: {}, artifacts: [],
    })),
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry(createMockLogger());
  });

  describe('register / get', () => {
    it('should register and retrieve a tool', () => {
      const tool = createMockTool({ id: 'fs.read', name: 'Read File' });
      registry.register(tool);
      expect(registry.get('fs.read')).toBe(tool);
    });

    it('should return null for unknown tool', () => {
      expect(registry.get('unknown')).toBeNull();
    });

    it('should get definition', () => {
      const tool = createMockTool({ id: 'fs.read', name: 'Read File' });
      registry.register(tool);
      const def = registry.getDefinition('fs.read');
      expect(def?.name).toBe('Read File');
    });
  });

  describe('unregister', () => {
    it('should remove a tool', () => {
      const tool = createMockTool({ id: 'fs.read' });
      registry.register(tool);
      registry.unregister('fs.read');
      expect(registry.get('fs.read')).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all enabled tools', () => {
      registry.register(createMockTool({ id: 'a', category: 'filesystem' }));
      registry.register(createMockTool({ id: 'b', category: 'git' }));
      registry.register(createMockTool({ id: 'c', category: 'search' }));
      expect(registry.list().length).toBe(3);
    });

    it('should filter by category', () => {
      registry.register(createMockTool({ id: 'a', category: 'filesystem' }));
      registry.register(createMockTool({ id: 'b', category: 'git' }));
      expect(registry.list('filesystem').length).toBe(1);
    });

    it('should exclude disabled tools', () => {
      registry.register(createMockTool({ id: 'a' }));
      registry.setEnabled('a', false);
      expect(registry.list().length).toBe(0);
    });
  });

  describe('execute', () => {
    it('should execute a tool', async () => {
      const tool = createMockTool({ id: 'test' });
      registry.register(tool);

      const result = await registry.execute('test', { path: '/tmp' }, {
        executionId: 'exec-1', toolId: 'test', userId: 'u1', organizationId: 'o1',
        conversationId: null, workspaceId: null, workingDirectory: '/tmp',
        environment: {}, timeout: 5000, dryRun: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toEqual({ result: 'ok' });
      }
    });

    it('should fail for unknown tool', async () => {
      const result = await registry.execute('unknown', {}, {
        executionId: 'exec-1', toolId: 'unknown', userId: 'u1', organizationId: 'o1',
        conversationId: null, workspaceId: null, workingDirectory: '/tmp',
        environment: {}, timeout: 5000, dryRun: false,
      });
      expect(result.success).toBe(false);
    });

    it('should fail for disabled tool', async () => {
      const tool = createMockTool({ id: 'test' });
      registry.register(tool);
      registry.setEnabled('test', false);

      const result = await registry.execute('test', {}, {
        executionId: 'exec-1', toolId: 'test', userId: 'u1', organizationId: 'o1',
        conversationId: null, workspaceId: null, workingDirectory: '/tmp',
        environment: {}, timeout: 5000, dryRun: false,
      });
      expect(result.success).toBe(false);
    });

    it('should track execution stats', async () => {
      const tool = createMockTool({ id: 'test' });
      registry.register(tool);

      await registry.execute('test', {}, {
        executionId: 'exec-1', toolId: 'test', userId: 'u1', organizationId: 'o1',
        conversationId: null, workspaceId: null, workingDirectory: '/tmp',
        environment: {}, timeout: 5000, dryRun: false,
      });

      const stats = registry.getStats();
      expect(stats.totalExecutions).toBe(1);
    });
  });

  describe('execution history', () => {
    it('should track execution history per user', async () => {
      const tool = createMockTool({ id: 'test' });
      registry.register(tool);

      await registry.execute('test', {}, {
        executionId: 'exec-1', toolId: 'test', userId: 'u1', organizationId: 'o1',
        conversationId: null, workspaceId: null, workingDirectory: '/tmp',
        environment: {}, timeout: 5000, dryRun: false,
      });

      const history = registry.getExecutionHistory('u1');
      expect(history.length).toBe(1);
    });
  });
});
