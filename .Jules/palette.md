## 2025-05-20 - TopBar Icon-Only Buttons Accessibility
**Learning:** Icon-only buttons (such as notification bell triggers and responsive search buttons where text is hidden on small screens) are completely unannounced or ambiguous to screen readers if missing explicit `aria-label`s. Furthermore, dynamic status badges (like unread notification counts) should be incorporated into the accessible label.
**Action:** Always provide explicit `aria-label` attributes for icon-only or text-truncated buttons, incorporating dynamic state (e.g. unread count) into the label text.
