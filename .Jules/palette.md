## 2025-09-17 - Icon-Only Controls & Dynamic Badge Accessibility
**Learning:** Icon-only navigation and topbar controls (like responsive search triggers, notification bell indicators, and modal close buttons) frequently lack accessible text for screen readers. Dynamic state badges (like unread counts) must be explicitly communicated in button `aria-label`s.
**Action:** Always provide explicit `aria-label`s on icon-only buttons and append dynamic context (e.g. unread count) so assistive tech users receive real-time feedback.
