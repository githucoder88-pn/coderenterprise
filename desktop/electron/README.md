# electron

**Purpose:** Electron main-process code.

## Subdirectories

| Path | Purpose |
|------|---------|
| [ipc/](ipc/) | IPC handlers. |
| [main/](main/) | Main process bootstrap (window lifecycle, menus). |
| [preload/](preload/) | Preload script exposing a safe API bridge. |
| [security/](security/) | CSP and process-hardening policies. |
| [services/](services/) | Main-process services (api bridge, sqlite db, terminal manager). |

