/**
 * Haptic feedback wrapper around expo-haptics with graceful fallback.
 * Honors the app-store hapticsEnabled flag.
 */
import { Platform, Vibration } from 'react-native';

export type FeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch {}

let enabled = true;
export function setHapticsEnabled(v: boolean) { enabled = v; }

export async function haptic(type: FeedbackType = 'light'): Promise<void> {
  if (!enabled) return;
  try {
    if (!Haptics?.default) {
      if (Platform.OS === 'android') Vibration.vibrate(type === 'heavy' ? 20 : type === 'error' ? [0,20,80,20] : 8);
      return;
    }
    const H = Haptics.default;
    const { ImpactFeedbackStyle, NotificationFeedbackType } = H;
    switch (type) {
      case 'light': return H.impactAsync(ImpactFeedbackStyle?.Light ?? 'light');
      case 'medium': return H.impactAsync(ImpactFeedbackStyle?.Medium ?? 'medium');
      case 'heavy': return H.impactAsync(ImpactFeedbackStyle?.Heavy ?? 'heavy');
      case 'success': return H.notificationAsync(NotificationFeedbackType?.Success ?? 'success');
      case 'warning': return H.notificationAsync(NotificationFeedbackType?.Warning ?? 'warning');
      case 'error': return H.notificationAsync(NotificationFeedbackType?.Error ?? 'error');
      case 'selection': return H.selectionAsync?.();
    }
  } catch {}
}

export const HapticsService = {
  send: () => haptic('medium'),
  receive: () => haptic('light'),
  success: () => haptic('success'),
  error: () => haptic('error'),
  warning: () => haptic('warning'),
  select: () => haptic('selection'),
  press: () => haptic('light'),
  toggle: () => haptic('selection'),
  longPress: () => haptic('heavy'),
  medium: () => haptic('medium'),
};
