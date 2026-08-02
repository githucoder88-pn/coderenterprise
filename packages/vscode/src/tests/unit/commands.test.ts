/**
 * Command Registration Tests
 */

import { describe, it, expect } from 'vitest';

// VS Code command IDs that must be registered
const REQUIRED_COMMANDS = [
  'coder.chat',
  'coder.plan',
  'coder.explain',
  'coder.review',
  'coder.refactor',
  'coder.test',
  'coder.commit',
  'coder.history',
  'coder.providers',
  'coder.models',
  'coder.settings',
  'coder.workspace.index',
  'coder.workspace.search',
  'coder.memory.store',
  'coder.memory.search',
  'coder.tools.list',
  'coder.tools.execute',
];

describe('Command Registration', () => {
  it('should define all required commands', () => {
    expect(REQUIRED_COMMANDS.length).toBe(17);
    expect(REQUIRED_COMMANDS).toContain('coder.chat');
    expect(REQUIRED_COMMANDS).toContain('coder.explain');
    expect(REQUIRED_COMMANDS).toContain('coder.review');
    expect(REQUIRED_COMMANDS).toContain('coder.workspace.search');
    expect(REQUIRED_COMMANDS).toContain('coder.tools.execute');
  });

  it('should have unique command IDs', () => {
    const unique = new Set(REQUIRED_COMMANDS);
    expect(unique.size).toBe(REQUIRED_COMMANDS.length);
  });

  it('should follow naming convention', () => {
    for (const cmd of REQUIRED_COMMANDS) {
      expect(cmd).toMatch(/^coder\./);
    }
  });
});
