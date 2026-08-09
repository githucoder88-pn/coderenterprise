## 2025-05-14 - Path Traversal Vulnerability via Flawed Prefix Check
**Vulnerability:** Path traversal in `safePath` function.
**Learning:** Checking if a resolved path starts with a base path string (`resolved.startsWith(baseResolved)`) is insecure. It allows access to sibling directories that share the same prefix (e.g., `/workspace/project` and `/workspace/project-secrets`).
**Prevention:** Always append the path separator (`path.sep`) to the base path before the `startsWith` check, or explicitly handle the case where the resolved path is exactly the base directory.
