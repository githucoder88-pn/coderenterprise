## 2024-05-24 - DoS vulnerability in timingSafeEqual
**Vulnerability:** Unhandled TypeError when calling `crypto.timingSafeEqual` with Buffers of different lengths in `verifyHash` function.
**Learning:** Node.js `timingSafeEqual` requires the buffers being compared to have identical lengths. If lengths mismatch, it throws a TypeError which could lead to Denial of Service (DoS) if unhandled or exposed in critical API endpoints.
**Prevention:** Always compare buffer lengths (`buffer1.length === buffer2.length`) before calling `timingSafeEqual`. Return false immediately if they differ to prevent exceptions and short-circuit the execution safely.
