## 2024-05-15 - N+1 Latency in Repository findByIds
**Learning:** The backend's IFirestoreClient adapter does not currently expose a native batch getAll() method. Sequential `findByIds` calls in repositories cause N+1 latency since each document fetch awaits individually.
**Action:** Use Promise.all() for concurrent document fetching by ID to prevent N+1 query latency in repositories.
