# Tools

Tools are strongly-typed functions exposed to models via the tool registry.

## Built-in tools

| Tool | Module | Description | Approvals |
|------|--------|-------------|-----------|
| Shell | `src/tools/shell/shell.tool.ts` | Run shell commands in workspace | Dangerous commands require approval |
| Filesystem | `src/tools/filesystem/filesystem.tool.ts` | Read/write/list files | Writes gated by policy |
| Git | `src/tools/git/git.tool.ts` | Git status/diff/commit/branch/log | Commits require approval |
| Browser | `src/tools/browser/browser.tool.ts` | Headless navigation & scraping | Network egress policy |
| Docker | `src/tools/docker/docker.tool.ts` | Container run/exec | Always needs approval |
| Search | `src/tools/search/search.tool.ts` | Semantic + keyword workspace search | – |
| MCP | `src/tools/mcp/mcp.tool.ts` | Model Context Protocol adapter | Per-server approval |

## Registering a tool

```ts
toolRegistry.register({
  name: 'my.tool',
  description: 'Does a thing',
  inputSchema: z.object({ foo: z.string() }),
  async execute({ foo }, ctx) {
    return { ok: true, result: '…' };
  },
});
```

Extension-contributed tools register via the extension runtime.
