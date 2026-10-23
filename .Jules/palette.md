## 2025-05-18 - Accessible Icon-Only Header Actions

**Learning:** Topbar icon-only buttons (search trigger, theme cycle, notification bell) lack screen reader context and dynamic status state (such as unread notification counts or active theme name) unless explicitly exposed through ARIA labels.
**Action:** Always provide descriptive `aria-label` attributes with dynamic state details on icon-only header controls and set `aria-hidden="true"` on decorative icons inside them.
