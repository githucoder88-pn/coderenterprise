## 2025-02-14 - Fix path traversal partial-prefix vulnerability
**Vulnerability:** Partial-prefix bypass in path traversal check in `safePath`. The check `resolved.startsWith(resolvedBase)` allows paths like `/app/workspace-secrets/` when `resolvedBase` is `/app/workspace` because they share the prefix.
**Learning:** `startsWith` on paths without the trailing slash is dangerous and easily bypassed.
**Prevention:** Ensure the base path ends with the directory separator (`path.sep`) before using `startsWith`, or use path containment utility libraries if available, and manually handle exact matches.
