# Providers API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/providers` | List configured providers |
| GET | `/providers/stats` | Provider usage stats |
| GET | `/providers/healthy` | Healthy providers |
| POST | `/providers/completions` | Sync completion (dev/test) |
| POST | `/providers/completions/stream` | Stream completion (dev/test) |
| POST | `/providers/embeddings` | Embed text |
| POST | `/providers/images` | Generate images |
| POST | `/providers/tokens/count` | Count tokens |

See also `docs/providers/` for per-provider capability matrix.
