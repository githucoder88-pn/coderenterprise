## 2026-08-09 - Firebase Firestore N+1 Query Patterns
**Learning:** The backend's `IFirestoreClient` adapter does not currently expose a native batch `getAll()` or `in` query method, meaning standard `findByIds` repository methods implemented with sequential `for` loops cause severe N+1 query latency.
**Action:** Use `Promise.all()` for concurrent document fetching by ID in repository `findByIds` methods until a native batch/in method is added to the Firestore client.
