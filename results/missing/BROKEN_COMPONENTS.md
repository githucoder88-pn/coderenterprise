# Broken Components

## AUD-001 — TypeScript syntax error
- **Severity:** Critical
- **Location:** `src/workspace/indexing/indexer.ts:17,79`
- **Cause:** `Promise<readonly IndexEntry>>` has an extra closing angle bracket; the implementation repeats the same invalid type.
- **Affected components:** backend build, workspace indexing, Docker build, every downstream package consuming backend output.
- **Risk level:** Release blocker.
- **Required fix:** Correct the return type to `Promise<readonly IndexEntry[]>`.
- **Dependencies:** None.
- **Estimated effort:** 15 minutes.
- **Suggested implementation:** Fix both declarations, run `npm run build`, then exercise indexing tests.

## AUD-002 — Lint command cannot initialize
- **Severity:** Critical
- **Location:** root `package.json:20`; repository root
- **Cause:** ESLint 9 is installed without a flat config.
- **Affected components:** source quality gate and CI.
- **Risk level:** Release blocker.
- **Required fix:** Add a compatible `eslint.config.js` or pin/migrate tooling consistently.
- **Dependencies:** TypeScript parser/plugin selection.
- **Estimated effort:** 0.5–1 day.
- **Suggested implementation:** Configure TypeScript files, ignores, and existing conventions, then run lint on every package.

## AUD-003 — Failing backend tests
- **Severity:** High
- **Location:** `src/tests/unit/knowledge`, `runtime`, `simulation`, `distributed`
- **Cause:** Current implementation/test expectations disagree in memory limits/access counts, correction/validation, approval escalation, policy evaluation, index chunking, replay comparison, and checkpoint cleanup.
- **Affected components:** runtime safety, knowledge indexing/memory, simulation recovery, distributed state.
- **Risk level:** High regression risk.
- **Required fix:** Triage each failure against intended behavior; do not suppress tests.
- **Dependencies:** Product semantics and deterministic test fixtures.
- **Estimated effort:** 2–4 days.
- **Suggested implementation:** Create issue-level reproductions, fix production behavior or stale assertions, and rerun the complete suite.

## AUD-017 — Authentication token semantics need review
- **Severity:** High
- **Location:** `src/modules/auth/auth.service.ts` (refresh flow)
- **Cause:** Audit inspection indicates the refresh token path returns the same value as the access token.
- **Affected components:** all clients and session revocation.
- **Risk level:** Token compromise extends session scope.
- **Required fix:** Issue distinct signed refresh tokens with separate claims, storage/revocation, and rotation.
- **Dependencies:** client token storage and auth contract tests.
- **Estimated effort:** 1–2 days.
- **Suggested implementation:** Separate token builders, validate token type/issuer/audience, rotate refresh tokens, and test replay/revocation.
