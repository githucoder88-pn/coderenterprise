## 2024-08-06 - V8 Optimization Timing Vulnerability in CSRF Validation
**Vulnerability:** A custom XOR loop was used for timing-safe string comparison, which is susceptible to V8 engine optimization-based side-channel timing attacks.
**Learning:** For cryptographic operations and comparisons, Node's native `node:crypto` functions (like `crypto.timingSafeEqual`) should be used over custom JavaScript logic. Furthermore, when using `timingSafeEqual`, you must compare the `byteLength` of the resulting buffers (after parsing from string format) to avoid crashing the server with a `RangeError` DoS if they mismatch.
**Prevention:** Always use Node's native crypto libraries. Ensure proper buffer length checks precede calls to `timingSafeEqual`.
