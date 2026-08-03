# Dashboard Architecture

```
src/
├── app/                  Next App Router (RSC + client)
│   ├── layout.tsx        Root layout (providers, fonts)
│   ├── page.tsx          Marketing / redirect
│   └── dashboard/        Authenticated area (shell + routes)
├── components/
│   ├── layout/           Sidebar, topbar, app-shell, command palette
│   └── ui/               Primitives: button, card, badge, stat, chart, data-table
├── hooks/                TanStack Query hooks (use-api)
├── lib/                  api.ts (fetch client), utils.ts (cn, date)
├── providers/            QueryClient, ThemeProvider
├── stores/               Zustand (auth-store, ui-store)
└── styles/               Tailwind entry
```

All data is fetched via TanStack Query from the same `/api/v1` backend; no business logic is duplicated in the dashboard. Auth token is stored in Zustand and persisted via `localStorage` in production, httpOnly cookie if served from the API domain.
