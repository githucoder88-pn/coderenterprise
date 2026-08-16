## 2025-02-27 - Fix timingSafeEqual Buffer Length DoS
**Vulnerability:** Node.js's `crypto.timingSafeEqual` was used to compare hashes in `src/services/security/encryption.ts` without checking if the buffer lengths were equal.
**Learning:** `timingSafeEqual` will throw a `TypeError` (or `RangeError` in older Node versions) if the buffers are of different lengths. Passing a malicious, short or long token would cause an unhandled exception, potentially crashing the application or a request handler, leading to a Denial of Service (DoS) vulnerability.
**Prevention:** Always check `bufferA.byteLength === bufferB.byteLength` before passing buffers into `timingSafeEqual`.
