
## 2025-02-14 - Fix Path Traversal in Filesystem Tool (Partial Prefix Matching)
**Vulnerability:** Path traversal in `src/tools/filesystem/filesystem.tool.ts` `safePath` function where the validation used a simple string prefix match `!resolved.startsWith(resolve(base))`. This allowed a malicious path like `../www-secret/key.txt` with base `/var/www` to be accepted because `/var/www-secret/key.txt` starts with `/var/www`.
**Learning:** Checking for path traversal using `startsWith` on a path without ensuring it ends with the directory separator (`path.sep`) is a critical security vulnerability known as "partial prefix matching".
**Prevention:** When validating paths to ensure they are confined to a base directory, always ensure the base path includes a trailing directory separator (e.g. `resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep`) before using `startsWith`, and separately handle the case where the resolved path exactly matches the base path.
