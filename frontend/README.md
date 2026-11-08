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

The committed `vercel.json` sets the public `NEXT_PUBLIC_API_URL` to
`https://tiaago-backend-web-production-3604.up.railway.app/api` for the Railway backend.
`next.config.js` uses this committed value for every production build, including
Vercel previews, overriding stale dashboard or `.env` values in compiled browser
and server code. To change the deployed backend, update both URL entries in
`vercel.json` and deploy the new commit. Local development uses `.env.local`.

For this Railway deployment, run the backend with `ENV=production`. Production
defaults allow the Railway hostname and the frontend origin
`https://tiaago-git-main-jays-projects-938c1689.vercel.app`.
If Railway defines `ALLOWED_HOSTS` or `CSRF_TRUSTED_ORIGINS`, those variables
replace the defaults: append `tiaago-backend-web-production-3604.up.railway.app` to
`ALLOWED_HOSTS` and `https://tiaago-git-main-jays-projects-938c1689.vercel.app`
to `CSRF_TRUSTED_ORIGINS` (comma-separated, preserving existing entries).
The backend uses `CSRF_TRUSTED_ORIGINS` as its CORS origin allowlist too.
The project's production URL (`https://tiaago.vercel.app`), main branch URL,
and the approved deployment origin
`https://tiaago-5uq2qlswy-jays-projects-938c1689.vercel.app` are always included,
even if Railway provides an older `CSRF_TRUSTED_ORIGINS` value. Other deployment
origins must be explicitly approved; arbitrary Vercel origins are not allowed.
Use the production or main branch URL for ongoing testing as deployments change.
Redeploy the backend after changing its code or variables.

Deploy the new commit after changing the URL: Next.js embeds `NEXT_PUBLIC_*`
values at build time, so existing deployments retain their compiled URL.
The local `.env.local` file is not deployed to Vercel.

If a browser still requests a previous backend URL, check the deployment's Git
commit and open its unique deployment URL. A previous deployment retains its
compiled API URL even when project settings change.
