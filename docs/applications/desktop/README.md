# Desktop Application (`desktop/`)

Electron desktop app with chat, editor, and integrated terminal.

## Stack
- Electron 33, Vite 6, React 19
- Zustand, TanStack Query, Framer Motion, Lucide icons
- Tailwind 4
- `xterm` + `xterm-addon-fit` for terminal
- `better-sqlite3` for local cache, `node-pty` for terminal emulation, `electron-updater` for auto-updates

## Run
```bash
cd desktop
npm install
npm run dev
```

## Structure
- `electron/main/` — main process (window, menus)
- `electron/preload/` — contextBridge preload
- `electron/ipc/` — IPC handlers
- `electron/security/` — CSP/policies
- `electron/services/` — api bridge, sqlite, terminal manager
- `renderer/` — React UI (chat, editor, terminal, layout, views, stores)

See ARCHITECTURE.md, DEPENDENCIES.md, CONFIGURATION.md, DEPLOYMENT.md, TESTING.md, SECURITY.md, CHANGELOG.md, KNOWN_ISSUES.md in this folder.
