## 2024-08-05 - Custom Timing-Safe Comparison

**Vulnerability:** A custom bitwise XOR loop was used for timing-safe string comparison during CSRF token validation.
**Learning:** Custom JavaScript loops for constant-time comparison can sometimes be defeated by V8 engine optimizations (e.g., early exits or loop unrolling), making them vulnerable to timing attacks. Also, using string lengths and char codes for cryptographic comparisons is an anti-pattern.
**Prevention:** Always use Node.js's native `crypto.timingSafeEqual` with explicitly UTF-8 encoded Buffers of identical length for cryptographic equality checks to ensure true constant-time execution.
