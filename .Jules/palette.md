# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Header & Command Palette Icon Button Accessibility
**Learning:** Icon-only buttons in navigation bars and popovers (like search trigger, theme toggle, notifications bell, and modal close buttons) frequently lack clear ARIA labels or actionable descriptions for screen readers.
**Action:** Always complement icon-only buttons with explicit, descriptive `aria-label` attributes indicating both action and current state (e.g. `Switch theme, current mode: light`).
