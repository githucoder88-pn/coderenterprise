# Extensions

Extensions add tools, prompts, commands, and UI panels to CODER without modifying core code.

## Anatomy
A packaged extension is a zip with:
- `manifest.json` — name, version, permissions, contributions (tools/commands/prompts)
- `index.js` — entry executed inside the sandbox
- optional `resources/` (icons, templates, …)

## Runtime
`src/extensions/runtime/extension-runtime.ts` loads extensions in a Node `vm` sandbox with controlled globals, a capability-limited `fetch`, and a message bus (`messaging/message-bus.ts`) for RPC with the host.

## Lifecycle
Installed → Enabled → Running → Stopped → Disabled → Uninstalled. See `src/extensions/lifecycle/extension-lifecycle.ts`.

## Permissions
Declared in manifest, granted by admin/user per installation. Examples: `tools:execute`, `network:<host>`, `workspace:read`, `secrets:read`.

## Marketplace
`src/marketplace/` implements publishing, install, rating, and moderation.
