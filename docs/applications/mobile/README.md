# Mobile Application (`apps/mobile/`)

Premium React Native / Expo client for iOS and Android.

## Purpose
Deliver a native-feeling chat and workspace experience for phones, tablets, and foldables.
Reuses the backend REST+SSE API; does not duplicate business logic.

## Stack
- Expo SDK 52 / React Native 0.76 / TypeScript 5.7 / React 19
- Expo Router (file-based navigation, deep links)
- TanStack Query for data fetching + caching
- Zustand for client state (auth, UI prefs)
- Reanimated 3 + Gesture Handler 2 for gestures/animations
- FlashList for fast virtualized lists
- MMKV for offline cache/drafts
- expo-haptics, expo-av (voice), expo-image-picker, expo-document-picker,
  expo-clipboard, expo-notifications, expo-secure-store, expo-blur, expo-linear-gradient, expo-image

## Entry points
- `app/_layout.tsx` — root layout: providers, stack navigation, status bar
- `app/(tabs)/_layout.tsx` — bottom tab bar with auth guard + offline banner
- `app/(tabs)/index.tsx` — home/dashboard
- `app/(tabs)/conversations.tsx` — conversation list (FlashList + infinite pagination)
- `app/(tabs)/workspaces.tsx` — workspace browser
- `app/(tabs)/agents.tsx` — agent dashboard
- `app/(tabs)/more.tsx` — settings, providers, models, account
- `app/conversation/[id].tsx` — chat screen (streaming, markdown, code, voice, attachments)
- `app/auth.tsx`, `app/account.tsx`, `app/settings.tsx`

## Run
```bash
cd apps/mobile
npm install
npx expo start
# Scan QR with Expo Go; or npm run ios / npm run android
```

## Docs in this folder
- ARCHITECTURE.md, DEPENDENCIES.md, CONFIGURATION.md, DEPLOYMENT.md, TESTING.md, SECURITY.md, CHANGELOG.md, KNOWN_ISSUES.md
