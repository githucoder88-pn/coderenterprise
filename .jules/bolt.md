## 2024-05-18 - N+1 Queries in Repositories
**Learning:** Repositories were executing `findByIds` using sequential `await` in a `for...of` loop, causing O(N) network latency for fetching multiple items.
**Action:** Always use `Promise.all` when fetching multiple independent documents by ID to perform concurrent requests and reduce latency.
