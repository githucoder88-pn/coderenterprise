# Workflows

End-to-end user workflows with sequence-style descriptions.

## Send a message
1. User types in composer and taps send.
2. Client POSTs to `/conversations/:id/send/stream` with bearer token.
3. Server saves user message, builds context (memory + workspace + tools), calls provider.
4. Provider streams SSE deltas → client appends to assistant bubble.
5. On complete, message finalized, events published for analytics/notifications.

## Multi-agent goal
1. User types `/goal <…>` (or uses API/dashboard).
2. `POST /orchestrator/goals` → task-planner decomposes into a DAG.
3. Execution engine runs agents in topological order; tools call with approval when needed.
4. Checkpoints captured; progress streamed to clients via SSE.
5. Final synthesis returned; artifacts stored under the run.

## Attach a file
1. Client picks image/document (camera, library, clipboard, document picker).
2. File uploaded to Firebase Storage → signed URL.
3. Message sent with attachment metadata.
4. For images, vision-capable providers receive image blocks; for text files, first 10KB are inlined.

## Switch provider
1. Client picks provider in model/provider selector.
2. Server persists preference on conversation; future completions route accordingly.
3. Load balancer rebalances; circuit breakers reset.

## Offline send (mobile)
1. Client queues message in MMKV outbox.
2. `SyncManager` polls connectivity; when online, flushes queue with retries.
3. Messages appear in conversation when server ACKs.

## Extension install
1. User picks extension in marketplace UI.
2. `installer-service` downloads + verifies signature.
3. Registry record created, extension enabled, sandbox boots.
4. Contributed tools/commands appear in UI.
