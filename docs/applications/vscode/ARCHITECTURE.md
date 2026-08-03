# VS Code Extension Architecture

```
extension.ts        activation entry
├── authentication/ auth-service (SecretStorage + API login flow)
├── commands/       chat, editor, utility, workspace commands
├── providers/      hover, code-action, inline-completion
├── services/       api-client, chat-service, log-service
├── ui/             tree data providers (views.ts ties them together)
└── workspace/      workspace-service (index, search)
```

Bundled with esbuild into a single `dist/extension.js`. The extension uses VS Code's
`SecretStorage` for API keys and `WorkspaceConfiguration` for settings.
