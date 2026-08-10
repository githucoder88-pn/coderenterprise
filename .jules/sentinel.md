## 2024-05-18 - Node.js timingSafeEqual Length Mismatch DoS
**Vulnerability:** Calling `crypto.timingSafeEqual` with Buffers of unequal lengths throws a `RangeError: Input buffers must have the same byte length`. If used to verify hashes without prior length validation, an attacker could supply a mismatched hash string and crash the Node.js process (Denial of Service).
**Learning:** Node.js native `crypto.timingSafeEqual` does not silently fail or return false on length mismatches; it explicitly throws a `RangeError`.
**Prevention:** Always compare buffer lengths (`buffer1.length === buffer2.length`) before calling `crypto.timingSafeEqual`. If they don't match, return `false` early to avoid crashing the server.
