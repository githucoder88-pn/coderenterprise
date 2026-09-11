## 2025-05-18 - Accessibility on Icon-Only Topbar & Modal Action Buttons
**Learning:** Icon-only buttons in navigation bars and command palettes (like search triggers, notification bell icons, and close buttons) often omit accessible text labels, making them unusable for screen reader users.
**Action:** Always ensure icon-only interactive controls include descriptive `aria-label` attributes and test them via `@testing-library/react` role queries (e.g. `getByRole('button', { name: ... })`).
