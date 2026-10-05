## 2025-05-18 - Accessibility for Unread Badge Notification Buttons
**Learning:** Icon-only buttons with notification badge counters need dynamic `aria-label`s announcing unread items to screen readers, while visual badge dots must be marked `aria-hidden="true"` to prevent screen readers from reading raw indicator elements.
**Action:** Always compute unread state and provide an accessible descriptive label (`Notifications (X unread)`) on badge trigger buttons and mark badge status dots `aria-hidden="true"`.
