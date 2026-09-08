## 2025-05-18 - Notification Bell Accessible Labels
**Learning:** Icon-only notification buttons with visual badge indicators (like red dots) require dynamic `aria-label`s that expose the unread count to screen readers rather than relying solely on visual badges.
**Action:** Always compute `aria-label="Notifications (${unreadCount} unread)"` when unread notifications exist for icon-only notification triggers.
