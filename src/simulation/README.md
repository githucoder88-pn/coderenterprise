# simulation

**Purpose:** Benchmark/experiment harness.

## Subdirectories

| Path | Purpose |
|------|---------|
| [benchmarks/](benchmarks/) |  |
| [environments/](environments/) |  |
| [experiments/](experiments/) |  |
| [replay/](replay/) |  |
| [scenarios/](scenarios/) |  |
| [scoring/](scoring/) |  |

## Files

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel file — re-exports public API of this module. |
| `types.ts` | TypeScript types and Zod schemas. |

## Dependencies

- Imports resolved via tsconfig path aliases (`@core/*`, `@modules/*`, …).
- See `docs/FILE_RELATIONSHIPS.md` for layering rules.
