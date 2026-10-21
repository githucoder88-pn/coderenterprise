## 2025-10-21 - TopBar Action Buttons Accessibility & Focus Management
**Learning:** TopBar header action buttons and search triggers often lack screen reader ARIA labels and keyboard focus ring styles.
**Action:** Always complement icon-only buttons with explicit `aria-label` attributes (with dynamic status when applicable, e.g. unread count), mark icons `aria-hidden="true"`, and apply `focus-visible:ring-2` with design system tokens.
