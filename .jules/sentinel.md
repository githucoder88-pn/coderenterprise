## 2024-08-11 - Replace insecure Math.random() in rate limiter
**Vulnerability:** Used `Math.random()` to generate unique identifiers for Redis sorted sets in the rate limiter. `Math.random()` is not cryptographically secure and could lead to collisions or predictable keys.
**Learning:** `Math.random()` should never be used for uniqueness or security tokens in a security context (like rate limiting), as it is predictable and can lead to bypasses.
**Prevention:** Always use Node.js's native `node:crypto` functions (e.g., `crypto.randomUUID()` or `crypto.randomBytes()`) for generating unique identifiers or tokens in security contexts.
