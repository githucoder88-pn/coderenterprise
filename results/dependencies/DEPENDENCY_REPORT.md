# Dependency Report

## Package Areas

| Package | Install/build status | Vulnerabilities |
|---|---|---|
| Root backend | install succeeded with `--ignore-scripts`; build/typecheck fail | {'info': 0, 'low': 0, 'moderate': 12, 'high': 1, 'critical': 2, 'total': 15} |
| Dashboard | install succeeded; build failed on Google Fonts; typecheck fails | {'info': 0, 'low': 0, 'moderate': 3, 'high': 4, 'critical': 1, 'total': 8} |
| Desktop | typecheck and vite build pass; full electron-builder not validated | {'info': 0, 'low': 1, 'moderate': 4, 'high': 13, 'critical': 2, 'total': 20} |
| CLI | install succeeds; typecheck fails | {'info': 0, 'low': 0, 'moderate': 3, 'high': 1, 'critical': 1, 'total': 5} |
| VS Code | install succeeds; typecheck fails | {'info': 0, 'low': 0, 'moderate': 3, 'high': 1, 'critical': 1, 'total': 5} |
| Mobile | normal install fails; legacy peer install succeeds; typecheck fails | {'info': 0, 'low': 0, 'moderate': 7, 'high': 15, 'critical': 2, 'total': 24} |

## Dependency Problems

- Mobile React/React Native peer conflict.
- Mobile missing `expo-status-bar`.
- CLI missing `@inquirer/prompts`.
- Dashboard missing `@testing-library/react` for tests.
- Multiple independent app lockfiles are created when installing, while only root and desktop lockfiles are currently tracked.
- Critical/high vulnerabilities exist in all audited package areas.

## Recommended Dependency Policy

1. Adopt a monorepo workspace definition and one explicit lockfile strategy.
2. Add `npm audit --audit-level=high` or equivalent to CI with documented exceptions.
3. Align React versions per platform rather than globally using React 19.
4. Require `typecheck` and `build` scripts for every app package.
