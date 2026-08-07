## 2026-08-07 - [Unhandled TypeError in timingSafeEqual]
**Vulnerability:** Unhandled TypeError when supplying a different length hash to `crypto.timingSafeEqual` in authentication checks.
**Learning:** `crypto.timingSafeEqual` strictly requires matching buffer lengths, throwing a TypeError if not. This leads to a DoS vulnerability on the authentication checks if not caught or validated first. Also custom bitwise operators inside the codebase for timing safe comparisons were vulnerable to V8 optimizations.
**Prevention:** Ensure buffer lengths are explicitly compared and validated (`buffer1.length === buffer2.length`) before calling Node.js native `crypto.timingSafeEqual`.
