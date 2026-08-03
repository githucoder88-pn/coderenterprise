# Dependencies

Runtime (see `apps/mobile/package.json`):

| Package | Purpose |
|---------|---------|
| `expo`, `expo-router` | App shell + file-based routing |
| `react`, `react-native` | UI |
| `react-native-reanimated`, `react-native-gesture-handler` | Gestures/animations |
| `react-native-safe-area-context` | Notch/Dynamic Island/tablet insets |
| `react-native-screens` | Native stack navigation |
| `react-native-mmkv` | Fast offline KV (caches, drafts, outbox) |
| `@shopify/flash-list` | Virtualized lists (chat) |
| `react-native-svg` | Icon/chart primitives |
| `@tanstack/react-query` | Data fetching, caching, retries |
| `zustand` | Client state (auth, theme, prefs) |
| `zod` | Validation (shared schemas) |
| `date-fns` | Date formatting |
| `expo-secure-store` | Encrypted token storage |
| `expo-local-authentication` | Biometric unlock |
| `expo-notifications` | Push/local notifications |
| `expo-image-picker`, `expo-document-picker`, `expo-clipboard`, `expo-image` | Attachments |
| `expo-av` | Voice recording |
| `expo-haptics` | Tactile feedback |
| `expo-blur`, `expo-linear-gradient` | Visual effects (tab bar, shimmer) |
| `expo-status-bar` | Status bar management |
| `expo-file-system` | File upload support |

Dev: TypeScript 5.7, Vitest.
