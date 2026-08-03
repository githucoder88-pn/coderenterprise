# Agents & Orchestration

## Built-in agents
| Role | Icon | Responsibility |
|------|------|---------------|
| planner | 🎯 | Decompose goals into DAG tasks |
| researcher | 🔎 | Gather context, search workspace/web |
| architect | 🏗 | Design approaches & trade-offs |
| coder | 💻 | Implement code changes |
| reviewer | 👀 | Review diffs & quality |
| tester | 🧪 | Generate/run tests |
| debugger | 🐛 | Diagnose errors, propose fixes |
| documenter | 📝 | Write/update docs |

Registered in `src/orchestrator/registry/agent-registry.ts`.

## Lifecycle
1. **Goal submitted** (via `/goal` slash command, API, dashboard, CLI).
2. **Planner** produces task DAG.
3. **Execution engine** runs tasks respecting dependencies.
4. Each task:
   - assembles context (memory, prior results, tool output),
   - invokes the assigned agent via the ProviderRouter,
   - can call tools (shell, git, browser, docker, …) with approval gates,
   - passes through reflection/evaluation before being marked complete.
5. **Checkpoints** are taken before destructive operations.
6. **Final synthesis** produces the answer / patch / plan for the user.

## Files
- `src/orchestrator/planner/task-planner.ts`
- `src/orchestrator/execution/execution-engine.ts`
- `src/orchestrator/checkpoints/checkpoint-manager.ts`
- `src/orchestrator/registry/agent-registry.ts`
- `src/intelligence/*` — higher-order reasoning layers
- `src/runtime/*` — approvals, memory, policies

See `../architecture/agent-orchestration.md` for the sequence diagram.
