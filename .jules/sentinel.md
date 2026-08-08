## 2023-10-24 - Unhandled Exception in timingSafeEqual
**Vulnerability:** Calling Node's native `timingSafeEqual` with buffers of unequal lengths throws a TypeError instead of returning false, which can cause unhandled exceptions and potentially denial of service (DoS).
**Learning:** `crypto.timingSafeEqual` strictly expects inputs of identical byte length.
**Prevention:** Always compare buffer lengths (`Buffer.length` or `Buffer.byteLength`) before calling `timingSafeEqual`, returning `false` early if they don't match.
