
## 2024-05-24 - Unhandled Exception in timingSafeEqual
**Vulnerability:** Calling `crypto.timingSafeEqual` with buffers of differing lengths throws a `RangeError` (or `TypeError` in older Node versions). If user input directly feeds into one of these buffers, it can crash the application or cause unhandled exceptions leading to potential DoS or data leakage.
**Learning:** `crypto.timingSafeEqual` in Node.js does not safely handle variable length arguments, unlike simple equality operators. The lengths of the two buffers must be exactly equal.
**Prevention:** Always compare `buffer1.byteLength === buffer2.byteLength` and return `false` early before invoking `crypto.timingSafeEqual`.
