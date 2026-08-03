# VS Code Extension (`packages/vscode/`)

CODER extension for Visual Studio Code: chat sidebar, inline completions, code actions, workspace indexing.

## Commands (from `package.json`)
- `coder.chat`, `coder.plan`, `coder.explain`, `coder.review`, `coder.refactor`, `coder.test`, `coder.commit`, `coder.history`,
- `coder.providers`, `coder.models`, `coder.settings`, `coder.workspace.index`, `coder.workspace.search`,
- `coder.memory.store`, `coder.memory.search`, `coder.tools.list`, `coder.tools.execute`

## Stack
- `@types/vscode` ^1.96, esbuild bundle, vitest
- No runtime dependencies (only `zod`)

## Build / Run
```bash
cd packages/vscode
npm install
npm run build
# Press F5 in VS Code to launch Extension Development Host
```

Views: conversations, workspaces, tools, models, providers, logs.

See ARCHITECTURE.md, DEPENDENCIES.md, CONFIGURATION.md, DEPLOYMENT.md, TESTING.md, SECURITY.md, CHANGELOG.md, KNOWN_ISSUES.md in this folder.
