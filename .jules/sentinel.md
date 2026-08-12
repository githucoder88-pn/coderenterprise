## 2024-05-18 - Missing Buffer Length Validation in crypto.timingSafeEqual

**Vulnerability:** DoS due to `RangeError` thrown by `crypto.timingSafeEqual` and V8 timing leak optimizations in custom comparison loops.
**Learning:** `crypto.timingSafeEqual` in Node.js requires exactly matching byte lengths; if lengths differ, it throws an exception rather than returning `false`. Also, custom JavaScript loops (using bitwise ops) for timing-safe checks are vulnerable to V8 optimizations.
**Prevention:** Always check buffer length (`buf1.length === buf2.length`) *before* calling `crypto.timingSafeEqual`. Always use native `crypto.timingSafeEqual` instead of writing custom bitwise loops.
