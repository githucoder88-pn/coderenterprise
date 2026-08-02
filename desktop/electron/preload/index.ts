/**
 * Preload Script
 *
 * Exposes a safe, typed API to the renderer via contextBridge.
 * No Node.js APIs leak to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // ─── Workspace ───────────────────────────────────────────────────────────
  workspace: {
    create: (data: any) => ipcRenderer.invoke('workspace:create', data),
    list: () => ipcRenderer.invoke('workspace:list'),
    index: (id: string) => ipcRenderer.invoke('workspace:index', id),
    search: (query: any) => ipcRenderer.invoke('workspace:search', query),
    getFiles: (id: string) => ipcRenderer.invoke('workspace:files', id),
    readFile: (path: string) => ipcRenderer.invoke('workspace:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('workspace:writeFile', path, content),
  },

  // ─── Providers ───────────────────────────────────────────────────────────
  provider: {
    list: () => ipcRenderer.invoke('provider:list'),
    stats: () => ipcRenderer.invoke('provider:stats'),
    update: (id: string) => ipcRenderer.invoke('provider:update', id),
    sync: () => ipcRenderer.invoke('provider:sync'),
  },

  // ─── Models ──────────────────────────────────────────────────────────────
  model: {
    list: (filter?: any) => ipcRenderer.invoke('model:list', filter),
    search: (query: string) => ipcRenderer.invoke('model:search', query),
    sync: () => ipcRenderer.invoke('model:sync'),
  },

  // ─── Chat ────────────────────────────────────────────────────────────────
  chat: {
    send: (conversationId: string, message: any) => ipcRenderer.invoke('chat:send', conversationId, message),
    stream: (conversationId: string, message: any) => ipcRenderer.invoke('chat:stream', conversationId, message),
    getConversations: () => ipcRenderer.invoke('chat:conversations'),
    getMessages: (id: string) => ipcRenderer.invoke('chat:messages', id),
    create: (data: any) => ipcRenderer.invoke('chat:create', data),
    onChunk: (callback: (chunk: any) => void) => {
      const handler = (_: any, chunk: any) => callback(chunk);
      ipcRenderer.on('chat:chunk', handler);
      return () => ipcRenderer.removeListener('chat:chunk', handler);
    },
    onComplete: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('chat:complete', handler);
      return () => ipcRenderer.removeListener('chat:complete', handler);
    },
  },

  // ─── Tools ───────────────────────────────────────────────────────────────
  tool: {
    list: (category?: string) => ipcRenderer.invoke('tool:list', category),
    execute: (id: string, input: any) => ipcRenderer.invoke('tool:execute', id, input),
    stats: () => ipcRenderer.invoke('tool:stats'),
  },

  // ─── Terminal ────────────────────────────────────────────────────────────
  terminal: {
    start: (options?: any) => ipcRenderer.invoke('terminal:start', options),
    write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    stop: (id: string) => ipcRenderer.invoke('terminal:stop', id),
    onData: (callback: (data: { id: string; data: string }) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (callback: (data: { id: string; code: number }) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: {
    login: (credentials: any) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getStatus: () => ipcRenderer.invoke('auth:status'),
  },

  // ─── System ──────────────────────────────────────────────────────────────
  system: {
    getTheme: () => ipcRenderer.invoke('system:theme'),
    setTheme: (theme: string) => ipcRenderer.invoke('system:setTheme', theme),
    getVersion: () => ipcRenderer.invoke('system:version'),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  },

  // ─── Updates ─────────────────────────────────────────────────────────────
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      const handler = (_: any, info: any) => callback(info);
      ipcRenderer.on('updater:available', handler);
      return () => ipcRenderer.removeListener('updater:available', handler);
    },
  },
};

contextBridge.exposeInMainWorld('coder', api);

export type CoderAPI = typeof api;
