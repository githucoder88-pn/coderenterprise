## 2024-08-06 - Timing-Safe Comparisons

**Vulnerability:** Found insecure timing-safe comparisons in string comparisons.
**Learning:** Custom JavaScript loops for timing-safe comparison (e.g., bitwise XOR over string characters) are susceptible to optimization-based timing attacks by the V8 engine. Using simple string equality (`===`) is also vulnerable to timing attacks when verifying cryptographic signatures.
**Prevention:** Always use Node's native `timingSafeEqual` from the `node:crypto` module, passing identical-length `Buffer` or `Uint8Array` arguments, for all cryptographic string/token comparisons.
