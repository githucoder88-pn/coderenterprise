/**
 * IPC Handlers
 *
 * Bridge between renderer and main process services.
 * All handlers are async and return structured results.
 */

import { ipcMain, shell } from 'electron';
import { apiBridge } from '../services/api-bridge.js';
import { db } from '../services/database.js';
import { terminalManager } from '../services/terminal-manager.js';

export function registerIpcHandlers(): void {
  // ─── Workspace ───────────────────────────────────────────────────────────
  ipcMain.handle('workspace:create', async (_, data) => apiBridge.post('/workspaces', data));
  ipcMain.handle('workspace:list', async () => apiBridge.get('/workspaces'));
  ipcMain.handle('workspace:index', async (_, id) => apiBridge.post('/workspace/index', { workspaceId: id }));
  ipcMain.handle('workspace:search', async (_, query) => apiBridge.post('/workspace/search', query));
  ipcMain.handle('workspace:files', async (_, id) => apiBridge.get(`/workspaces/${id}/files`));
  ipcMain.handle('workspace:readFile', async (_, path) => apiBridge.get(`/workspace/files/read?path=${encodeURIComponent(path)}`));
  ipcMain.handle('workspace:writeFile', async (_, path, content) => apiBridge.post('/workspace/files/write', { path, content }));

  // ─── Providers ───────────────────────────────────────────────────────────
  ipcMain.handle('provider:list', async () => apiBridge.get('/providers'));
  ipcMain.handle('provider:stats', async () => apiBridge.get('/providers/stats'));
  ipcMain.handle('provider:update', async (_, id) => apiBridge.post(`/providers/${id}/update`, {}));
  ipcMain.handle('provider:sync', async () => apiBridge.post('/tools/models/sync', {}));

  // ─── Models ──────────────────────────────────────────────────────────────
  ipcMain.handle('model:list', async (_, filter) => apiBridge.get('/tools/models', filter));
  ipcMain.handle('model:search', async (_, query) => apiBridge.get(`/tools/models/search?q=${encodeURIComponent(query)}`));
  ipcMain.handle('model:sync', async () => apiBridge.post('/tools/models/sync', {}));

  // ─── Chat ────────────────────────────────────────────────────────────────
  ipcMain.handle('chat:conversations', async () => apiBridge.get('/conversations'));
  ipcMain.handle('chat:messages', async (_, id) => apiBridge.get(`/conversations/${id}/messages`));
  ipcMain.handle('chat:create', async (_, data) => apiBridge.post('/conversations', data));
  ipcMain.handle('chat:send', async (_, conversationId, message) => apiBridge.post(`/conversations/${conversationId}/send`, message));
  ipcMain.handle('chat:stream', async (event, conversationId, message) => {
    try {
      const response = await apiBridge.stream(`/conversations/${conversationId}/send/stream`, message);
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { event.sender.send('chat:complete'); return; }
            try { event.sender.send('chat:chunk', JSON.parse(data)); } catch {}
          }
        }
      }
      event.sender.send('chat:complete');
    } catch {
      event.sender.send('chat:complete');
    }
  });

  // ─── Tools ───────────────────────────────────────────────────────────────
  ipcMain.handle('tool:list', async (_, category) => apiBridge.get(`/tools${category ? `?category=${category}` : ''}`));
  ipcMain.handle('tool:execute', async (_, id, input) => apiBridge.post(`/tools/${id}/execute`, { input }));
  ipcMain.handle('tool:stats', async () => apiBridge.get('/tools/stats'));

  // ─── Terminal ────────────────────────────────────────────────────────────
  ipcMain.handle('terminal:start', async (event, options) => {
    const id = terminalManager.create(options ?? {});
    terminalManager.onData(id, (data) => event.sender.send('terminal:data', { id, data }));
    terminalManager.onExit(id, (code) => event.sender.send('terminal:exit', { id, code }));
    return id;
  });
  ipcMain.handle('terminal:write', async (_, id, data) => terminalManager.write(id, data));
  ipcMain.handle('terminal:resize', async (_, id, cols, rows) => terminalManager.resize(id, cols, rows));
  ipcMain.handle('terminal:stop', async (_, id) => terminalManager.stop(id));

  // ─── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', async () => db.getSettings());
  ipcMain.handle('settings:set', async (_, key, value) => { db.setSetting(key, value); return true; });
  ipcMain.handle('settings:reset', async () => { db.resetSettings(); return true; });

  // ─── Auth ────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_, credentials) => apiBridge.post('/auth/sign-in', credentials));
  ipcMain.handle('auth:logout', async () => apiBridge.post('/auth/sign-out', {}));
  ipcMain.handle('auth:status', async () => db.getSetting('auth_status', { user: null }));

  // ─── System ──────────────────────────────────────────────────────────────
  ipcMain.handle('system:theme', async () => db.getSetting('theme', 'dark'));
  ipcMain.handle('system:setTheme', async (_, theme) => { db.setSetting('theme', theme); return true; });
  ipcMain.handle('system:version', async () => '1.0.0');
  ipcMain.handle('system:openExternal', async (_, url) => shell.openExternal(url));

  // ─── Updater ─────────────────────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => ({ available: false, version: '1.0.0' }));
  ipcMain.handle('updater:download', async () => true);
  ipcMain.handle('updater:install', async () => true);
}
