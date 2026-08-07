## 2024-05-18 - timingSafeEqual Length Mismatch DoS Vulnerability
**Vulnerability:** Calling `crypto.timingSafeEqual` with buffers of unequal length throws a `RangeError` (or `TypeError` in older Node versions). If user input dictates one of the lengths without validation, it can lead to unhandled exceptions crashing the Node.js server (Denial of Service).
**Learning:** Found that `verifyHash` was passing string representations directly into `Buffer.from(x, 'hex')` and into `timingSafeEqual` without ensuring the byte length of the resulting buffers matched.
**Prevention:** Always compare buffer lengths before invoking `crypto.timingSafeEqual`. E.g., `if (a.length !== b.length) return false;`.
