## 2025-05-24 - Unhandled Exception in timingSafeEqual
**Vulnerability:** Application crash/DoS vector due to missing length validation before calling `crypto.timingSafeEqual` in `EncryptionService.verifyHash`.
**Learning:** Node's `crypto.timingSafeEqual` throws a `TypeError` (or `RangeError` in older versions) if the provided buffers do not have identical byte lengths. When used to compare user-provided inputs against stored hashes without validating lengths first, this exposes an unhandled exception that can crash the Node process (leading to a denial of service) or leak internal execution state.
**Prevention:** Always compare the `.length` properties of both Buffers before passing them to `timingSafeEqual`. If lengths differ, immediately return `false`.
