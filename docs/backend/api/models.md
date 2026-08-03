# Models API

Base: `/tools/models`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List known models (with capabilities) |
| POST | `/sync` | Sync model catalog from providers |
| GET | `?provider=<name>` | Filter by provider |
