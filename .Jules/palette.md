## 2025-05-18 - TopBar Icon Button Accessibility
**Learning:** Icon-only navigation and topbar controls (like notifications and command palette search triggers) must include dynamic context-aware ARIA labels (e.g. indicating badge count) and visible keyboard focus indicators (`focus-visible:ring-2`).
**Action:** Always provide `aria-label` with dynamic state descriptions and explicit focus ring utility classes for header buttons.
