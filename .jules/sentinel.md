## 2025-02-14 - timingSafeEqual DoS
**Vulnerability:** Unhandled TypeError when buffers passed to timingSafeEqual differ in length.
**Learning:** `timingSafeEqual` in `node:crypto` throws if lengths are not exactly identical. If an attacker passes a payload that evaluates to a different byte length, the exception can crash the process (DoS).
**Prevention:** Always compare buffer lengths (e.g., `hashBuf.length !== computedBuf.length`) before calling `timingSafeEqual`, returning `false` early if they don't match.
