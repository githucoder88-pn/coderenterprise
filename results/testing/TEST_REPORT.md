# Test Report

## Commands Executed

| Area | Command | Result |
|---|---|---|
| Backend | `npm run typecheck` | Failed |
| Backend | `npm run build` | Failed |
| Backend | `npm test` | Failed and OOM |
| Dashboard | `npx tsc -p tsconfig.json --noEmit` | Failed |
| Dashboard | `npm run build` | Failed due external font fetch |
| Desktop | `npx tsc -p tsconfig.json --noEmit` | Passed |
| CLI | `npx tsc -p tsconfig.json --noEmit` | Failed |
| VS Code | `npx tsc -p tsconfig.json --noEmit` | Failed |
| Mobile | `npm install --legacy-peer-deps && npx tsc -p tsconfig.json --noEmit` | Failed |

## Backend Test Failures Observed

- `MemoryManager > retrieve > should retrieve by layer and key`
- `MemoryManager > retrieve > should track access count`
- `RuntimeManager > correctTask > should fail after max corrections`
- `RuntimeManager > validateTask > should validate and update task status`
- `DistributedCheckpointManager > cleanup > should clean up old checkpoints`
- `ApprovalManager > escalate > should escalate to critical`
- Full suite reached V8 heap limit and aborted.

## Missing Test Categories

- API contract tests comparing mounted server routes to clients.
- Desktop Monaco/xterm/preload integration tests.
- Electron packaged smoke tests with native modules.
- CLI command tests for login/chat/tools with API mocks.
- VS Code extension activation tests.
- Mobile Expo Router/navigation and notification token tests.
- Security tests for auth scheme matrix and RBAC enforcement.
- Recovery tests for queues/workers/checkpoints.
- Performance tests for workspace indexing/search and streaming.
