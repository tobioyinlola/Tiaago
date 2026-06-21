# TIAAGO Frontend

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui.

## Setup

```bash
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm dev                     # http://localhost:3000
```

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
```

## Production

Deployed on Vercel. Auto-deploys on push to `main` via Git integration. Root directory set to `frontend/` in Vercel project settings.

API calls go to `https://api.tiaago.com` (EC2 backend).
