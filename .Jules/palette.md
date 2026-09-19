## 2025-05-10 - Header Icon Buttons Accessibility & Screen Reader State
**Learning:** Header icon-only buttons (such as notification badges and theme switches) often omit ARIA labels and dynamic unread state feedback, rendering them inaccessible to screen reader users, especially when text is hidden on smaller viewports.
**Action:** Always provide explicit `aria-label` attributes on icon-only header buttons and include dynamic state information (e.g. unread count).
