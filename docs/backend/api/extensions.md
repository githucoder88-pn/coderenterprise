# Extensions API

Base: `/extensions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Installed extensions |
| POST | `/` | Install an extension (from marketplace or URL) |
| PATCH | `/:id` | Enable/disable/reconfigure |
| DELETE | `/:id` | Uninstall |
| GET | `/marketplace` | Search marketplace |
| POST | `/:id/invoke` | Invoke an extension command |
