## 2025-02-12 - Prevent V8 engine optimization-based timing attacks
**Vulnerability:** The CSRF token validation and Webhook signature verification previously used string comparison (`===`) or a custom Javascript loop with bitwise XORs to compare tokens.
**Learning:** Node's V8 engine optimizations can break custom timing-safe logic in JavaScript (e.g. short-circuiting bitwise logic) causing unintended timing vulnerabilities. The string length could also be leaked.
**Prevention:** Always use Node.js' built-in `crypto.timingSafeEqual` function, ensuring buffers are checked for identical lengths prior to avoid `RangeError`.
