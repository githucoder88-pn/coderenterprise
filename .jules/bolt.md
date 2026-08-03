## 2024-05-18 - Memoizing expensive arrays during render
**Learning:** Next.js applications that perform filtering or set generation inside functional components that execute frequently (such as on keystrokes in a search input) will block the main thread unnecessarily. This can be easily avoided by leveraging useMemo.
**Action:** Use useMemo to cache expensive array iterations (filter, map, Set) within components where dependencies (e.g. data or search input) change independently of each other.
