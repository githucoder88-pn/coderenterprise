## 2024-05-24 - [Path Traversal in Filesystem Tools]
**Vulnerability:** Path traversal vulnerability in `safePath` function due to incorrect prefix checking.
**Learning:** Checking if a resolved path starts with a base path using string `startsWith` without trailing path separator allows partial directory name matches, leading to path traversal outside the intended directory (e.g., `/tmp/dir_hacked` starts with `/tmp/dir`).
**Prevention:** Ensure the base path always ends with a path separator (e.g. `path.sep`) before performing a `startsWith` check for directory containment, or handle exact matches separately.
