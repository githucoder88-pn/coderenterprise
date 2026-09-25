## 2025-05-18 - Dynamic Accessible Labels for Badge-Decorated Icon Buttons
**Learning:** Icon-only buttons with visual notification badges (like an unread dot) convey critical state visually that screen readers ignore if `aria-label` is static or absent. Updating `aria-label` dynamically to include badge count (e.g., `Notifications (3 unread)`) ensures equal accessibility.
**Action:** Whenever adding or inspecting icon buttons with visual indicators/badges in topbars or overlays, include dynamic `aria-label` attributes reflecting the visual state.
