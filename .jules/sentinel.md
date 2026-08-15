## 2026-08-15 - Replace custom timing-safe equality check
**Vulnerability:** Use of custom JS XOR loop for timing-safe equality check.
**Learning:** V8 engine optimizations can theoretically impact the constant time execution of a custom JS logic loop. `node:crypto`'s `timingSafeEqual` should be used instead.
**Prevention:** Always use `node:crypto` native functions (like `timingSafeEqual`) for cryptographic operations and comparisons rather than custom logic.
