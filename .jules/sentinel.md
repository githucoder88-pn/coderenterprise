## 2025-02-27 - Partial Prefix Path Traversal
**Vulnerability:** The `safePath` function in `src/tools/filesystem/filesystem.tool.ts` used a naive `resolved.startsWith(resolve(base))` check. This allowed a partial prefix directory traversal if the directory name matches the beginning of a sibling directory's name (e.g., trying to access `../dir-hacked` when the base is `/path/to/dir`).
**Learning:** `startsWith` checks on file paths are vulnerable unless the prefix explicitly includes the directory separator (e.g., `path.sep`).
**Prevention:** Always append the OS-specific directory separator (`path.sep`) to the base directory before performing string-based path containment checks, or manually handle exact directory matches.
