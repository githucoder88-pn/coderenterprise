# Security

- JWT tokens are stored in `expo-secure-store` (Keychain on iOS, Keystore on Android).
- All HTTPS enforced at the platform layer; cert pinning recommended for enterprise deployments.
- Biometric lock available via `hooks/use-biometrics.ts` backed by `expo-local-authentication`.
- Clipboard images are opt-in via the attachment picker; no auto-pasting.
- Voice recordings are transmitted to the backend over HTTPS.
- MMKV cache can be cleared from Settings.
