# Workspaces API

Base: `/workspaces`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List workspaces |
| POST | `/` | Create workspace |
| GET | `/:id` | Workspace details |
| PATCH | `/:id` | Update metadata |
| DELETE | `/:id` | Delete workspace |
| POST | `/index` | Trigger workspace indexing |
| POST | `/search` | Semantic + keyword search |
| GET | `/:id/status` | Indexing status, git state |
| GET | `/:id/files` | List files (paginated) |
| GET | `/:id/diff` | Current diff |
