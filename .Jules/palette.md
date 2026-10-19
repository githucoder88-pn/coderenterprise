## 2025-05-18 - TopBar Icon-Only Buttons Accessibility
**Learning:** TopBar action buttons (Search, Theme Toggle, Notifications) were relying on visual icons or static labels that didn't describe dynamic state (such as unread notification count or active theme). Adding dynamic `aria-label`s makes header controls significantly more accessible to screen readers.
**Action:** When creating icon-only or dynamic header buttons, always supply dynamic ARIA labels indicating current state and purpose.
