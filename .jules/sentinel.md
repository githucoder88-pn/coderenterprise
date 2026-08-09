## 2024-05-18 - [timingSafeEqual TypeErrors]
**Vulnerability:** Calling `timingSafeEqual` with two differently-sized buffers throws a TypeError, leading to application crash (DoS).
**Learning:** Node.js native `crypto.timingSafeEqual` does not handle length mismatches gracefully.
**Prevention:** Always compare buffer lengths before passing them to `timingSafeEqual`.
