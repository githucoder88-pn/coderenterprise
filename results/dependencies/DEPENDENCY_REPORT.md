# Dependency Report

## Findings

- Six `package.json` files exist, but the root declares `pnpm >=9` while the committed lockfile is `package-lock.json`; no `pnpm-lock.yaml` exists.
- The Dockerfile uses pnpm-oriented installation while local quick-start documentation says `npm install`.
- `@playwright/test` is declared by multiple applications, but no Playwright configuration was found.
- Root ESLint is version 9, but no `eslint.config.js|mjs|cjs` exists.
- Prettier is declared but no repository configuration was found.
- Multiple package manifests have independent versions of React, TypeScript, Vitest, and tooling without a workspace policy.
- `npm ci` completed, but reported 15 dependency vulnerabilities (12 moderate, 1 high, 2 critical); the audit output also reported deprecated transitive packages.

## Issue register

### AUD-006 — Package manager and lockfile mismatch
- **Severity:** High
- **Location:** `package.json:9`, `package-lock.json`, `Dockerfile`, `README.md:58`
- **Cause:** Tooling and documentation select different package managers.
- **Affected components:** backend image builds, reproducible installs, all package consumers.
- **Risk:** Non-reproducible dependency graphs and divergent local/CI builds.
- **Required fix:** Select npm or pnpm, remove contradictory instructions, and commit the matching lockfile.
- **Dependencies:** CI design and package workspace decision.
- **Estimated effort:** 0.5–1 day.
- **Suggested implementation:** Use one package manager in Docker, docs, scripts, and CI; enforce it with `packageManager`.

### AUD-010 — Dependency vulnerability backlog
- **Severity:** High
- **Location:** root install audit output
- **Cause:** Installed dependency graph contains 15 known advisories.
- **Affected components:** backend and transitive tooling.
- **Risk:** Known exploitable dependency paths may reach production artifacts.
- **Required fix:** Triage each advisory, update compatible direct/transitive dependencies, and document accepted residual risk.
- **Dependencies:** lockfile normalization.
- **Estimated effort:** 1–2 days.
- **Suggested implementation:** Run the package manager audit in CI, upgrade within semver first, then test before considering breaking upgrades.
