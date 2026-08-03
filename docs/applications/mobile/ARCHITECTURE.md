# Mobile Architecture

## Layered view

```
app/ (Expo Router screens)
 └── components/ (chat, code, voice, attachments, common primitives, sheets, skeletons)
 └── hooks/ (TanStack Query hooks, cached queries, biometrics)
 └── theme/ (design tokens, ThemeProvider)
 └── stores/ (Zustand)
 └── services/ (API + SSE client)
 └── providers/ (AppProvider wraps QClient, Theme, GestureHandler, SafeArea, auth bootstrap)
 └── offline/ (MMKV cache, outbox queue, sync manager)
 └── utils/ (haptics, responsive breakpoints)
 └── lib/ (slash command registry)
 └── security/ (secure storage)
 └── notifications/ (expo-notifications wrapper)
```

## Navigation
- Expo Router file-based routing.
- Stack (root) → Tabs (Home, Chat, Workspaces, Agents, More).
- Modal routes: auth, settings; push routes: conversation/[id], account.
- Tablets/foldables: responsive breakpoints (compact/regular/expanded/tablet/desktop)
  computed via `utils/responsive.ts`; content max-width clamped to 720 px.

## Chat pipeline
```
Composer → api.streamMessage (SSE) → append deltas → FlashList
                                              ↓
                              MessageBubble → MarkdownRenderer → CodeBlock
```
- Typing indicator while the assistant bubble is empty and streaming.
- Slash commands (`/goal`, `/review`, …) show a suggestions panel above the composer.
- Long-press on a message opens a BottomSheet (Copy / Retry / Share).
- Swipe gesture on bubbles (decorative via Gesture Handler).

## Offline
- MMKV persists TanStack Query caches (`CacheManager`) and per-conversation drafts (`DraftStore`).
- Outgoing messages queued in MMKV when offline (`QueueManager`); flushed on reconnect via `SyncManager`.
- Animated offline banner drops from top when SyncManager detects loss of connectivity.

## Performance
- FlashList for chat (estimatedItemSize=120).
- `react-native-reanimated` 3 runs animations on UI thread.
- Code block tokenizer is a hand-rolled JS tokenizer (no highlight.js tree-shake cost).
- Markdown is parsed in a custom minimal parser (no heavy markdown dep).
- Bottom sheet is hand-built with Reanimated + Gesture Handler (no @gorhom/bottom-sheet).
