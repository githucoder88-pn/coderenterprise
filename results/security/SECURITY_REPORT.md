# Security Report

## Authentication and Authorization

- Backend registers `authMiddleware` after public auth/health/providers routes.
- Dashboard/mobile send Firebase Bearer tokens.
- Desktop/CLI/VS Code send `X-API-Key` or store token as API key in some flows.
- The audit did not find a single documented auth matrix proving which credential type each route accepts.

## Supply Chain

Dependency vulnerability summaries:

```json
{
  "root": {
    "info": 0,
    "low": 0,
    "moderate": 12,
    "high": 1,
    "critical": 2,
    "total": 15
  },
  "dashboard": {
    "info": 0,
    "low": 0,
    "moderate": 3,
    "high": 4,
    "critical": 1,
    "total": 8
  },
  "desktop": {
    "info": 0,
    "low": 1,
    "moderate": 4,
    "high": 13,
    "critical": 2,
    "total": 20
  },
  "cli": {
    "info": 0,
    "low": 0,
    "moderate": 3,
    "high": 1,
    "critical": 1,
    "total": 5
  },
  "vscode": {
    "info": 0,
    "low": 0,
    "moderate": 3,
    "high": 1,
    "critical": 1,
    "total": 5
  },
  "mobile": {
    "info": 0,
    "low": 0,
    "moderate": 7,
    "high": 15,
    "critical": 2,
    "total": 24
  }
}
```

## Electron Security

Security-sensitive calls were found by static scan: 16.

Notable areas:

- `shell.openExternal` is exposed through system IPC and should validate URL schemes/hosts.
- Terminal PTY spawns local shells; this is expected but requires workspace trust boundaries.
- BrowserWindow security policies should be enforced and tested, not only declared.

## Backend Security Risks

- Route modules that are not mounted also do not receive tested auth/RBAC behavior.
- API-key and Firebase-token auth modes are inconsistent across clients.
- Billing/payment placeholders should not be exposed as production features.
- Tool execution route, once mounted, must enforce per-tool permission checks, input validation, timeouts and audit logging.

## Required Security Work

1. Auth matrix tests for bearer token, API key, expired token, revoked user and RBAC denial.
2. IPC allowlist tests for desktop.
3. Tool execution sandbox/permission tests.
4. Dependency vulnerability triage.
5. Secrets scanning and environment variable documentation.
