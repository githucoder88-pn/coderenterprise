# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Dynamic ARIA Labels for Notification and Modal Trigger Icons
**Learning:** Icon-only navigation buttons with dynamic badge indicators (e.g., notification bells) are uninformative to screen reader users if static or unlabelled. Including live status like unread counts directly in the `aria-label` ensures screen reader users receive the same context as visual users.
**Action:** Always check icon-only buttons with badge overlays and ensure `aria-label` dynamically reflects badge counts or status updates.
