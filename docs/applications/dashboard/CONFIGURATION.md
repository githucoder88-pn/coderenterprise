# Configuration

Environment variables (read on the client; prefix with `NEXT_PUBLIC_` to expose to RSC/client bundles):

- `NEXT_PUBLIC_API_URL` — backend base URL (default `http://localhost:3000/api/v1`)
- `NEXT_PUBLIC_APP_NAME` — app title, default `CODER`

Server-only envs (SSR/RSC) are read by the server-side fetch helper; never expose secrets to the client bundle.
