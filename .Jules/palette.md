## 2026-10-30 - TopBar Icon Button Accessibility
**Learning:** Icon-only navigation buttons (e.g., search, theme toggle, notifications, close modal) often lack explicit screen-reader labels or unread state announcements, and decorative SVG icons need `aria-hidden="true"`.
**Action:** Always provide explicit `aria-label`s with dynamic state information (e.g., `Notifications (${unreadCount} unread)`) and mark decorative sub-icons with `aria-hidden="true"`.
