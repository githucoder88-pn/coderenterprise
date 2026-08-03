# Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Strict CSP; only preload-exposed APIs are available in renderer.
- Terminal executes locally with the user's permission; commands are displayed before execution.
- Tokens encrypted via Electron `safeStorage`.
