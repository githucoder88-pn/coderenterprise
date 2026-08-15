## 2025-02-14 - Prevent Partial Prefix Path Traversal
**Vulnerability:** The filesystem tool used `resolved.startsWith(resolvedBase)` to prevent path traversal. This allows partial prefix attacks, where a user can break out of a directory if the target directory's name starts with the same string as the base directory (e.g., base `/app/dir`, target `/app/dir2`).
**Learning:** Checking for path prefixes with simple string methods like `startsWith` without a trailing path separator is insufficient for path traversal protection.
**Prevention:** Always append a path separator (`path.sep`) to the base directory before using `.startsWith()` to check for directory inclusion, and manually handle exact path matches.
