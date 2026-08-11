## 2026-08-11 - Replaced Math.random with crypto.randomUUID
**Vulnerability:** Weak random number generation using Math.random() for uniqueness.
**Learning:** Math.random() is predictable. While used as a tie-breaker in Redis sorted sets, replacing it with crypto.randomUUID() guarantees uniqueness and prevents potential collisions without blocking the event loop like crypto.randomBytes().
**Prevention:** Always use cryptographically secure random number generators (CSPRNG) like crypto.randomUUID() for uniqueness or secrets instead of Math.random().
