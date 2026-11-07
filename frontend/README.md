# TIAAGO Frontend

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui.

## Setup

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
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

Before deploying, open **Vercel → Project → Settings → Environment Variables**
and add `NEXT_PUBLIC_API_URL` for Production (and Preview if you use preview
deployments). Set it to the live backend URL including `/api`, for example
`https://YOUR-RENDER-SERVICE.onrender.com/api` for a Render backend.
Use the actual URL from your backend hosting dashboard.

The committed `vercel.json` sets `NEXT_PUBLIC_API_URL` to
`https://tiaago-production.up.railway.app/api` for the Railway backend.
Keep any project-level override consistent with this address.

Redeploy after saving the variable: Next.js embeds `NEXT_PUBLIC_*` values at
build time, so changing a variable does not update an existing deployment.
The local `.env.local` file is not deployed to Vercel.

If a build reports `NEXT_PUBLIC_API_URL is not set` while collecting page data
for `/api/reports/[id]/export-pdf`, the variable is missing from that deployment's
environment. The shared API configuration is loaded during the build, so this
error occurs before the route handles any requests.
