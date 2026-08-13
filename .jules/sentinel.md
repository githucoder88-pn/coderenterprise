## 2024-05-18 - Path Traversal Vulnerability via Partial Prefix Match
**Vulnerability:** The `safePath` function used `resolved.startsWith(resolve(base))` to check for path traversals. This allowed partial prefix matches (e.g. `base=/app/workspace` and `target=../workspace-secrets` resolves to `/app/workspace-secrets`, which starts with `/app/workspace`).
**Learning:** Using `String.prototype.startsWith()` directly on resolved paths is dangerous because it doesn't account for path separators, making sibling directories with a shared prefix accessible.
**Prevention:** Always ensure the base path string used in a `.startsWith()` check ends with a path separator (`path.sep`), or use a library that handles path containment correctly. Also handle exact matches for the base path itself.
