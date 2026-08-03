# Security

## Authentication
- Firebase Auth for identity + JWT issued by the backend for API access.
- Short-lived access tokens (15 min) + rotating refresh tokens (7 days).
- API keys for server-to-server access with scoped permissions (read/write/admin).

## Authorization
- RBAC in `src/modules/rbac/` (owner/admin/member/viewer).
- Attribute-based policy engine in `src/enterprise/policies/` for compliance/DLP.
- Route guards: `authMiddleware` verifies JWT; handlers enforce resource ownership.

## Encryption
- TLS in transit.
- Secrets at rest encrypted via AES-256-GCM (`src/services/security/encryption.ts`).
- Tokens on mobile stored with `expo-secure-store`; Electron uses `safeStorage`; VS Code uses `SecretStorage`.

## Hardening
- CORS configured per env.
- Security headers via `middleware/security-headers.ts` (HSTS, CSP, X-Content-Type, Referrer-Policy).
- CSRF protection for cookie-based clients.
- Rate limiting (Redis sliding window): 100 req/min per key by default.
- Input validation with Zod on every request.
- XSS sanitization for user-supplied HTML/Markdown.
- Abuse detection / anomaly detection (`services/security/abuse-detection.ts`, `anomaly-detection.ts`).
- Circuit breakers prevent provider-level cascade failures from becoming security issues.

## Container/OS
- Non-root Docker user; distroless-style alpine image; HEALTHCHECK.
- Redis password-protected and bound to internal network in production.
- Firebase service accounts scoped to least privilege.

## Incident response
- All mutations emit audit events (`modules/audit`).
- Structured logs with request IDs for tracing.
- Circuit breaker / anomaly events logged at `warn`/`error` and can be forwarded to PagerDuty via webhooks.
