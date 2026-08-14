## 2024-08-14 - Prevent N+1 queries in IFirestoreClient adapters
**Learning:** The backend's `IFirestoreClient` adapter lacks a native batch `getAll()` method, leading to N+1 query performance issues when repositories use `for...of` loops to fetch multiple documents sequentially by ID.
**Action:** Always use `Promise.all` with `Array.prototype.map` for concurrent document fetching by ID in repositories instead of sequential loops.
