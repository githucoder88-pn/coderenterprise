# Security

- All auth is via JWT bearer token or httpOnly cookie.
- CSP and security headers should be applied at the edge/CDN.
- Never expose Firebase keys beyond the public web API key.
- Client-side validation uses Zod; server always re-validates.
