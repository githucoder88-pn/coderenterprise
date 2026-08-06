## 2024-05-01 - Prevent Timing Attacks in Cryptographic Comparisons
**Vulnerability:** String comparison (`===`) or custom JS XOR loops were used for cryptographic signatures (webhooks, CSRF).
**Learning:** V8 engine optimizations or early exits in string comparisons can leak the length or matching characters of a cryptographic signature, making it vulnerable to timing attacks.
**Prevention:** Always use Node's native `node:crypto.timingSafeEqual()` method with `Buffer.from()` when comparing cryptographic hashes, signatures, or secrets.
