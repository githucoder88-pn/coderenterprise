## 2024-02-12 - Icon-only buttons lacking ARIA labels
**Learning:** This design system frequently uses icon-only buttons (like notifications, theme togglers, search triggers, and modal close buttons) without corresponding `aria-label`s. This makes them completely opaque to screen readers.
**Action:** When working on new components or reviewing existing ones, explicitly check for buttons that contain only icons (`<LucideIcon />`) and ensure they have a descriptive `aria-label` attribute.
