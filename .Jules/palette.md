## 2025-05-15 - Icon-only buttons with dynamic badges
**Learning:** Icon-only navigation buttons with dynamic notification dots need explicit dynamic `aria-label`s (e.g. "Notifications (3 unread)") and `aria-hidden="true"` on visual red dots to prevent duplicate or ambiguous announcements by screen readers.
**Action:** When adding or auditing icon buttons with badges in the header, always verify `aria-label` includes count state and apply `aria-hidden="true"` to badge elements.
