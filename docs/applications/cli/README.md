# CLI (`packages/cli/`)

Terminal client for CODER, built with Commander and Ink (React for terminals).

## Commands
`coder login`, `coder chat`, `coder providers`, `coder models`, `coder agents`, `coder workspace`, `coder tools`, `coder billing`, `coder extensions`, `coder status`, `coder memory`, `coder logs`, `coder config`, `coder update`.

## Stack
Node 22, Commander, Ink 5, ink-text-input/ink-select-input/ink-spinner, marked + marked-terminal, eventsource-parser for streaming, Conf + better-sqlite3 for local storage, zod for config validation.

## Install
```bash
cd packages/cli
npm install
npm run build
npm link          # optional: exposes `coder` binary
coder --help
```

See ARCHITECTURE.md, DEPENDENCIES.md, CONFIGURATION.md, DEPLOYMENT.md, TESTING.md, SECURITY.md, CHANGELOG.md, KNOWN_ISSUES.md in this folder.
