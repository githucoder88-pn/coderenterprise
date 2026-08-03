# Agents / Orchestrator API

Base: `/orchestrator` (mounted at `/api/v1/orchestrator`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/agents` | List registered agent types |
| POST | `/goals` | Submit a goal (kicks off multi-agent run) |
| GET | `/goals/:id` | Goal progress & current state |
| GET | `/goals/:id/artifacts` | Output artifacts of a run |
| POST | `/goals/:id/cancel` | Cancel a running goal |
| POST | `/goals/:id/checkpoints/:cp/restore` | Restore a checkpoint (branch) |

Submitting a goal returns the run id; stream progress via SSE at `GET /orchestrator/goals/:id/stream`.
