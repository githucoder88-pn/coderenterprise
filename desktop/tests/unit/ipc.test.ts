/**
 * IPC Channel Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
  contextBridge: { exposeInMainWorld: vi.fn() },
  app: { getPath: () => '/tmp', isPackaged: false },
  BrowserWindow: vi.fn(),
  shell: { openExternal: vi.fn() },
  session: { defaultSession: { webRequest: { onHeadersReceived: vi.fn() }, setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() } },
  nativeTheme: { shouldUseDarkColors: true },
}));

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({ onData: vi.fn(), onExit: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn() })),
}));

describe('IPC Channels', () => {
  it('should define all required channels', () => {
    const requiredChannels = [
      'workspace:create', 'workspace:index', 'workspace:list', 'workspace:search',
      'provider:list', 'provider:update', 'provider:sync',
      'model:list', 'model:search', 'model:sync',
      'chat:send', 'chat:stream', 'chat:conversations', 'chat:messages', 'chat:create',
      'tool:list', 'tool:execute', 'tool:stats',
      'terminal:start', 'terminal:write', 'terminal:resize', 'terminal:stop',
      'settings:get', 'settings:set', 'settings:reset',
      'auth:login', 'auth:logout', 'auth:status',
      'system:theme', 'system:setTheme', 'system:version', 'system:openExternal',
      'updater:check', 'updater:download', 'updater:install',
    ];

    expect(requiredChannels.length).toBe(34);
    expect(requiredChannels).toContain('chat:send');
    expect(requiredChannels).toContain('terminal:start');
    expect(requiredChannels).toContain('provider:list');
  });
});
