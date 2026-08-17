## 2024-05-18 - Fix DoS in crypto.timingSafeEqual
**Vulnerability:** Uncaught exception DoS via `crypto.timingSafeEqual` length mismatch.
**Learning:** When verifying hex-encoded hashes using `crypto.timingSafeEqual`, passing user input directly into `Buffer.from(input, "hex")` allows attackers to manipulate the buffer length. `timingSafeEqual` requires both buffers to be identically sized and will aggressively throw an exception if they are not, tearing down the Node.js process if unhandled.
**Prevention:** Always assert `bufA.length === bufB.length` before attempting a timing-safe equality check. If the expected hash has a known, fixed size, returning `false` early on length mismatches is safe from timing attacks.
