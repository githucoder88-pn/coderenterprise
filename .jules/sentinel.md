## 2024-05-20 - Math.random() in Redis keys for sliding window rate limiter
**Vulnerability:** Found `Math.random()` being used to create unique identifiers for members added to a Redis sorted set in a sliding window rate limiter (`src/services/security/rate-limiter.ts`). While primarily intended to prevent score collisions, using a non-cryptographically secure PRNG could theoretically allow predictability under specific high-concurrency attack conditions.
**Learning:** Even internal uniqueness keys in distributed systems should use cryptographically secure sources if they relate to security enforcement mechanisms like rate limiting.
**Prevention:** Use Node.js's native `crypto.randomBytes().toString('hex')` or similar robust unique identifiers for security-related tracking.
