# Configuration

## Build config (`app.json`)

- Bundle ID: `ai.coder.mobile` (iOS + Android).
- Scheme: `coder` (for deep linking `coder://...`).
- Permissions declared for camera, microphone, photo library, and Face ID
  (iOS `NS*UsageDescription`, Android `<uses-permission>`).
- Expo plugins: router, secure-store, notifications, image-picker, av.

## Runtime config

The API URL is read from `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000/api/v1`).
No other runtime env is required — all theming and haptic preferences are user-controllable
from Settings and persisted via MMKV.

## Deep links

- `coder://conversations/:id` — open a conversation.
- `coder://auth` — sign-in screen.

## Theme
Design tokens in `theme/tokens.ts` define light/dark color palettes, spacing, radii,
typography, and shadows. ThemeProvider resolves the active palette via the app store
(dark/light/system).
