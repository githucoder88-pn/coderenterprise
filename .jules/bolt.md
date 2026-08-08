## 2024-05-20 - Firestore Document Batch Fetching Performance
**Learning:** The `IFirestoreClient` adapter in the backend doesn't expose a native batch `getAll()` method, leading to N+1 query latency issues when iterating over lists of IDs to fetch documents (e.g., using a `for...of` loop with `await findById`).
**Action:** When fetching multiple documents by their IDs in repositories (like `findByIds`), always use `Promise.all()` to fire the requests concurrently rather than sequentially. Combine this with loose null checking (`!= null`) to filter out missing documents cleanly.
