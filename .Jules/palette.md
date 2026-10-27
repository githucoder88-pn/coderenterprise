# Palette Journal - Critical UX & Accessibility Learnings

## 2025-05-15 - Dynamic Accessible Labels for Icon Triggers with Unread Badges
**Learning:** Icon-only buttons with visual badge indicators (like unread notification dots/counts) are completely inaccessible to screen readers if they lack `aria-label` or only have static labels. Screen readers need dynamic context about unread counts (e.g. `Notifications (3 unread)` vs `Notifications`).
**Action:** When adding or updating icon-only trigger buttons with notification badges or status indicators, always compute a dynamic `aria-label` that includes the status/count context for assistive technologies.
