/**
 * Biometric authentication helper — wraps expo-local-authentication.
 */
export async function authenticate(reason = 'Unlock CODER'): Promise<boolean> {
  try {
    const la = require('expo-local-authentication');
    const has = await la.hasHardwareAsync?.();
    if (!has) return true; // no hardware → skip
    const types = await la.supportedAuthenticationTypesAsync?.();
    if (!types?.length) return true;
    const enrolled = await la.isEnrolledAsync?.();
    if (!enrolled) return true;
    const res = await la.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel' });
    return res?.success ?? true;
  } catch {
    return true;
  }
}
