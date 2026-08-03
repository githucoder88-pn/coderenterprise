# Security Report

## Implemented controls

Firebase/JWT authentication, RBAC, audit services, API-key hashing, encrypted secrets, AES-256 encryption helpers, rate limiting, CSRF/XSS services, security headers, CORS, and abuse/anomaly service code are present.

## Findings

### AUD-017 — Access and refresh token separation
- **Severity:** High
- **Location:** `src/modules/auth/auth.service.ts`
- **Cause:** Refresh flow appears to reuse the access token value.
- **Affected components:** auth service, mobile/dashboard/CLI/VS Code clients.
- **Risk:** Refresh-token compromise and access-token replay have the same scope and lifetime.
- **Required fix:** Distinct token types, rotation, revocation, and audience/type validation.
- **Dependencies:** client stores and API contract.
- **Estimated effort:** 1–2 days.
- **Suggested implementation:** Implement separate signing claims and negative tests for cross-use.

### AUD-018 — Development secrets are unsafe defaults
- **Severity:** High
- **Location:** `.env.example:23,33`
- **Cause:** Example values use `change-me` secrets and configuration defaults permit demo Firebase.
- **Affected components:** local deployments copied without replacement.
- **Risk:** Accidental deployment with predictable signing/encryption keys.
- **Required fix:** Fail closed in production and provide startup validation that rejects placeholders.
- **Dependencies:** environment policy and deployment configuration.
- **Estimated effort:** 0.5–1 day.
- **Suggested implementation:** Reject known placeholders when `NODE_ENV=production`; document secret generation.

### AUD-019 — Tool execution requires boundary verification
- **Severity:** High
- **Location:** `src/tools/shell`, `filesystem`, `docker`, `mcp`
- **Cause:** Powerful tools exist; complete production authorization, sandboxing, resource limits, and audit integration were not demonstrated by tests.
- **Affected components:** agents, API tool routes, desktop/CLI clients.
- **Risk:** Command execution, path traversal, container escape, or untrusted MCP behavior.
- **Required fix:** Enforce per-tool permissions, workspace roots, timeouts, output limits, isolation, and immutable audit records.
- **Dependencies:** RBAC and event/telemetry wiring.
- **Estimated effort:** 3–7 days.
- **Suggested implementation:** Add deny-by-default policy checks and adversarial integration tests.

## Security validation limitations

No dynamic penetration test, dependency remediation, production Firebase rules review, secret rotation drill, or multi-tenant isolation test was available in this repository audit.
