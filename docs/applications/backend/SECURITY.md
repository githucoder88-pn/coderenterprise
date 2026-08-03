# Security

See `../../security/` for the full threat model. Key controls on the backend:

- **TLS-terminated** at the edge; HSTS and security headers via `middleware/security-headers.ts`.
- **Auth**: Firebase Auth + JWT; refresh-token rotation; API keys with scoped permissions.
- **RBAC/ABAC**: roles via `modules/rbac`; enterprise attribute-based policies in `enterprise/policies`.
- **Input validation**: Zod schemas on all request bodies and config; XSS sanitization (`services/security/xss-protection`).
- **Rate limiting**: per-user and per-IP sliding-window via Redis (`middleware/rate-limit`).
- **CSRF**: origin checks + SameSite cookies for web clients.
- **Secrets at rest**: AES-256-GCM in `modules/secrets`; encryption keys from env.
- **Abuse detection**: anomaly heuristics + circuit breakers per provider.
- **Audit log**: every mutation recorded in `modules/audit`.
- **Sandboxed tools**: shell/browser/docker run with cwd/time/output limits; approval gates for destructive ops.
- **Zero-trust guards** for inter-service calls (`services/security/zero-trust`).
- **Container hardening**: non-root user, distroless-style alpine, HEALTHCHECK, no unnecessary caps.

## Reporting vulnerabilities
Email `security@coder.enterprise` (placeholder).
