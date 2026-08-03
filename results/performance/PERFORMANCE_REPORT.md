# Performance Report

## Observations

- Backend test suite hit V8 heap out-of-memory, indicating either heavy tests, leaks, or runaway concurrency.
- Monaco adds large worker chunks in desktop Vite builds; this is expected but should be optimized via manual chunking and lazy loading.
- Workspace indexer currently cannot compile; no performance confidence exists for indexing/search.
- Dashboard build attempts external font fetch, adding deployment latency and fragility.
- In-memory EventBus and in-memory indexing structures may not scale across multiple backend instances.

## Risks

| Area | Risk | Recommendation |
|---|---|---|
| Backend tests/runtime | Heap exhaustion | Profile suite, isolate memory-heavy tests, cap Vitest workers |
| Desktop editor | Large Monaco chunks | Lazy load languages/workers; manual chunk configuration |
| Workspace indexing | Unknown due compile failure | Add benchmark tests and indexing limits/exclusions |
| Search | Hybrid search route not mounted | Add integration and load tests once mounted |
| Events/queues | In-memory local bus | Bridge to distributed queue/bus for cluster mode |

## Required Performance Tests

- Workspace indexing benchmark by file count and repository size.
- SSE streaming latency and backpressure tests.
- Provider retry/rate-limit stress tests.
- Terminal stream throughput tests.
- Dashboard page load and API waterfall tests.
