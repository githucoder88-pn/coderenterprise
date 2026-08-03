# Desktop Architecture

Two-process Electron app:

```
Main process (Node)          Preload (bridge)         Renderer (Chromium/React)
──────────────────           ───────────────          ───────────────────────
Window creation           contextBridge           React 19 + Tailwind
Menu/shortcuts           → ipcRenderer/invoke    → UI components
SQLite cache                                 ←       TanStack Query
node-pty terminal                              ←     xterm.js
Auto-update electron-updater                      Zustand store
```

IPC handlers live in `electron/ipc/handlers.ts`. Security policies in `electron/security/policies.ts` enforce CSP and disable `nodeIntegration`; renderer access is limited to what the preload bridge exposes.
