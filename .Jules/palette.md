## 2026-08-23 - Dynamic Notification & TopBar Accessibility
**Learning:** Icon-only buttons and notifications badges in topbar components often lack accessible screen reader labels and focus-visible indicators. Providing dynamic `aria-label`s with live count details and uniform `focus-visible:ring-2` styles ensures seamless keyboard and screen reader accessibility without layout distortion.
**Action:** Always verify icon-only buttons in navigation bars have precise `aria-label`, key shortcuts when appropriate (`aria-keyshortcuts`), and explicit focus ring utility classes.
