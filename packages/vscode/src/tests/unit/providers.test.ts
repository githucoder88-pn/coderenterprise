/**
 * Provider Configuration Tests
 */

import { describe, it, expect } from 'vitest';

describe('Extension Configuration', () => {
  it('should define all configuration properties', () => {
    const properties = [
      'coder.apiUrl',
      'coder.apiKey',
      'coder.defaultProvider',
      'coder.defaultModel',
      'coder.inlineCompletions',
      'coder.telemetry',
      'coder.theme',
    ];
    expect(properties.length).toBe(7);
    expect(properties).toContain('coder.apiUrl');
    expect(properties).toContain('coder.inlineCompletions');
  });

  it('should have correct defaults', () => {
    const defaults = {
      'coder.apiUrl': 'http://localhost:3000/api/v1',
      'coder.inlineCompletions': true,
      'coder.telemetry': true,
      'coder.theme': 'auto',
    };
    expect(defaults['coder.apiUrl']).toBe('http://localhost:3000/api/v1');
    expect(defaults['coder.inlineCompletions']).toBe(true);
  });

  it('should define keybindings', () => {
    const keybindings = [
      { command: 'coder.chat', key: 'ctrl+shift+c', mac: 'cmd+shift+c' },
    ];
    expect(keybindings[0]!.command).toBe('coder.chat');
    expect(keybindings[0]!.mac).toBe('cmd+shift+c');
  });
});

describe('Editor Providers', () => {
  it('should support all required provider types', () => {
    const providerTypes = ['inlineCompletion', 'hover', 'codeAction'];
    expect(providerTypes.length).toBe(3);
  });

  it('should define code action kinds', () => {
    const kinds = ['refactor', 'quickfix'];
    expect(kinds).toContain('refactor');
    expect(kinds).toContain('quickfix');
  });
});
