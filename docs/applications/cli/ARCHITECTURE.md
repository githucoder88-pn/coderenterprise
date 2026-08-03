# CLI Architecture

```
src/
├── index.ts                  Commander program, subcommand registration
├── commands/                 One file per command (login, chat, providers, ...)
├── services/api.ts           Fetch + eventsource-parser streaming client
├── config/schema.ts          Zod config schema
├── config/store.ts           Conf-backed config store (~/.config/coder-nodejs)
├── storage/
│   ├── database.ts          better-sqlite3 wrapper
│   └── conversation-store.ts local conversation history
├── ui/                       Ink components (markdown, table, format)
└── tests/                    Vitest
```

Streaming is rendered via Ink; markdown is formatted with `marked-terminal`.
