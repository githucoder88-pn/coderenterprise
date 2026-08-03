## 2024-05-24 - Rate Limiting on Authentication Routes
**Vulnerability:** The application had a global rate limiter applied via `rateLimitMiddleware`, but sensitive routes like `/auth/sign-in` and `/auth/sign-up` lacked specific, stricter rate limits, leaving them potentially vulnerable to brute-force and credential-stuffing attacks.
**Learning:** Global rate limits are insufficient for endpoints that handle sensitive authentication operations, which typically require much tighter controls (e.g., 10 requests per minute) than general API endpoints.
**Prevention:** Always implement endpoint-specific rate limiting for authentication and authorization routes, overriding or augmenting the global defaults.
