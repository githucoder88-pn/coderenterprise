## 2024-05-24 - N+1 Query in Repository findByIds
**Learning:** The `findByIds` method across all backend repositories in `coderenterprise` is currently making sequential Firestore document fetches in a `for...of` loop (N+1 query problem). This causes unnecessary latency for multi-ID queries.
**Action:** The backend IFirestoreClient adapter does not currently expose a native batch getAll() method. I need to use `Promise.all()` to fetch documents concurrently in all repositories implementing `findByIds`.
