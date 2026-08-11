## 2024-05-24 - Repository Batch Fetching
**Learning:** The backend's `IFirestoreClient` adapter does not natively expose a batch `getAll()` method, causing `findByIds` in repositories to default to a naive `for...of` loop with `await` for each ID. This results in significant N+1 query latency for bulk operations.
**Action:** Replaced sequential `await` loops inside all `findByIds` repository methods with concurrent `Promise.all()` fetching. This parallelizes document retrieval, drastically reducing total fetch time, especially on large arrays.
