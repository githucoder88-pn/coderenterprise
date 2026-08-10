## 2026-08-04 - N+1 Query Anti-Pattern in Repositories
**Learning:** The backend's base repository implementations and their sub-classes frequently use a sequential `for...of` loop with `await` when fetching arrays of items by ID (`findByIds`). Because the `IFirestoreClient` adapter lacks a native batch `getAll` method, this causes a severe N+1 query problem on data fetching paths.
**Action:** Replace sequential `for` loops in repository `findByIds` methods with concurrent `Promise.all(ids.map(...))` to eliminate N+1 latency, ensuring strict null filtering (`!= null`) is applied afterward.
