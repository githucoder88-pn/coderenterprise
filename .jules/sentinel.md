## 2024-06-03 - [Fix Path Traversal in Filesystem Tool]
**Vulnerability:** Path traversal vulnerability in `src/tools/filesystem/filesystem.tool.ts` `safePath` function. The original check `!resolved.startsWith(resolve(base))` allows sibling directory traversal if a sibling directory prefix matches the base directory (e.g. `/foo/bar` vs `/foo/bar-sibling`).
**Learning:** `startsWith` alone on resolved paths is insufficient and dangerous for bounds checking as it matches partial segment names.
**Prevention:** Always append the directory separator (`node:path.sep`) to the base path before the `startsWith` check to ensure strict directory containment, and explicitly handle exact equality (e.g., `resolved !== resolvedBase`).
