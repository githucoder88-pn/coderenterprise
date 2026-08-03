# Dashboard (`dashboard/`)

Next.js 15 web console (App Router, React 19, Tailwind v4, TanStack Query).

## Purpose
Provide a web administrative and operational UI: manage conversations, workspaces,
providers, models, prompts, teams, billing, analytics, extensions, settings, and security.

## Stack
- Next.js 15 (App Router, RSC + client components)
- React 19, Tailwind 4, Framer Motion, Recharts
- TanStack Query, Zustand, React Hook Form + Zod
- lucide-react, sonner (toasts), date-fns

## Run
```bash
cd dashboard
npm install
npm run dev   # http://localhost:3000
```

## Routes (`src/app/dashboard/*`)
Home, Conversations, Workspaces, Agents, Prompts, Providers, Models, Extensions,
Organizations, Team, Billing, Analytics, Account, Security, Settings.

See companion files: ARCHITECTURE.md, DEPENDENCIES.md, CONFIGURATION.md, DEPLOYMENT.md,
TESTING.md, SECURITY.md, CHANGELOG.md, KNOWN_ISSUES.md (in this directory).
