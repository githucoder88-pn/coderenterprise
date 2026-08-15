## 2024-05-15 - N+1 Latency in Batch Operations
**Learning:** The backend's `IFirestoreClient` adapter does not expose a native batch `getAll()` method, leading to N+1 query latency in repositories when iterating sequentially over IDs (e.g., using `for...of`).
**Action:** Use `Promise.all()` for concurrent document fetching by ID when native batch operations are unavailable, converting `O(n)` sequential network latency into roughly `O(1)` concurrent latency.
