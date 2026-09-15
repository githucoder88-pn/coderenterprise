## 2025-05-18 - Topbar Icon Buttons Accessibility
**Learning:** Icon-only interactive elements or buttons with hidden responsive text (such as search triggers or notification bell buttons) lack default screen reader labels if rely solely on nested visible elements or visual badges.
**Action:** Always provide explicit, dynamic `aria-label` attributes for topbar trigger buttons and icon controls to ensure screen reader context (e.g. including unread counts or clear action descriptions).
