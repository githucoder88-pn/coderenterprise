## 2025-02-27 - Node.js crypto.timingSafeEqual RangeError vulnerability
**Vulnerability:** Calling `crypto.timingSafeEqual` with Buffers of different lengths causes Node.js to throw a `RangeError`. This unhandled error crashes the application, resulting in a Denial of Service (DoS).
**Learning:** This existed because `timingSafeEqual` strictly requires exactly the same byte lengths. Converting strings using `Buffer.from(token, 'hex')` can easily result in different byte lengths if user input provides a shorter/longer hex string.
**Prevention:** Always compare buffer byte lengths (e.g., `bufA.length !== bufB.length`) and explicitly return false *before* passing them to `timingSafeEqual`.
