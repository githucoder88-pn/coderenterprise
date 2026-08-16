## 2025-02-14 - Prevent RangeError in timingSafeEqual

**Vulnerability:** A potential Denial of Service (DoS) vulnerability existed in `verifyHash` where `crypto.timingSafeEqual` was called with buffers of varying lengths.
**Learning:** In Node.js, `timingSafeEqual` throws a `RangeError` ("Input buffers must have the same byte length") if the buffers are unequal in length. This can cause the process to crash if unhandled, leading to a DoS.
**Prevention:** Always compare the byte lengths of the buffers before passing them to `timingSafeEqual`. If the lengths mismatch, return `false` early (this is safe from timing attacks if the expected hash length is known and fixed, as it is with `scrypt`).
