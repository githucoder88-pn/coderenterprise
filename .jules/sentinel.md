## 2024-05-15 - [Timing Attack Vulnerability in Webhook Signature Verification]
**Vulnerability:** The `verifySignature` method in `WebhookService` used a strict equality check (`===`) to compare the expected and provided signatures.
**Learning:** This exposes the application to timing attacks, as attackers can deduce the valid signature character-by-character based on the time it takes for the comparison to fail.
**Prevention:** Always use a constant-time comparison function, such as `crypto.timingSafeEqual` in Node.js, when comparing security-sensitive data like signatures or cryptographic hashes. Additionally, ensure the input buffers have the same length before calling `timingSafeEqual` to avoid `TypeError`.
