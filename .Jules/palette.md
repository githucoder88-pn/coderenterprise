# Palette's Journal - Critical Learnings

## 2025-05-18 - Icon-Only Controls in Dashboard Header & Dialogs
**Learning:** Topbar search triggers, notification bell buttons, and modal close buttons lacked explicit `aria-label` attributes, rendering them inaccessible to screen reader users despite visual cues.
**Action:** Always verify icon-only buttons (`button` with only SVG child icons or minimal text) in shared components have informative `aria-label` attributes (`aria-label="Search or open command palette"`, `aria-label="Notifications"`, `aria-label="Close command palette"`).
