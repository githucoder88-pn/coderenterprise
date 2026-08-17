## 2025-02-12 - Prevent DoS from timingSafeEqual throws
**Vulnerability:** Uncaught exceptions when calling `crypto.timingSafeEqual` with differently-sized buffers.
**Learning:** `timingSafeEqual` will throw an error if the compared buffer lengths mismatch, leading to application crashes (DoS) when fed arbitrary user input.
**Prevention:** Always compare buffer lengths before passing them to `timingSafeEqual`. If the expected string length is constant, returning `false` early on length mismatch avoids timing side-channels.
