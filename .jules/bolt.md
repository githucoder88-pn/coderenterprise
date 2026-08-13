## 2025-05-18 - N+1 Query in Repository findByIds
**Learning:** The backend's IFirestoreClient adapter does not currently expose a native batch getAll() method. The base repository and its implementers (WorkspaceRepository, ModelRepository, ConversationRepository, etc.) use a sequential `for (const id of ids) { await findById(id) }` loop which causes an N+1 query performance bottleneck.
**Action:** Use `Promise.all()` to fetch documents concurrently by mapping the IDs array to `findById` promises.
