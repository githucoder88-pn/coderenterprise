## 2025-02-28 - N+1 Query Prevention in Repositories
**Learning:** The `BaseRepository`'s abstract `findByIds` method was commonly implemented across multiple modules using a sequential `for...of` loop, causing N+1 query latency for bulk data operations.
**Action:** When implementing bulk lookup methods like `findByIds`, always map IDs to an array of promises and use `Promise.all()` (or `Promise.allSettled()`) for concurrent fetching to avoid sequential blocking.
