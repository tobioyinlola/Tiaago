# TIAAGO

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v2/monitor/2p25o.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

Talent marketplace connecting African developers with startups. Candidates build a profile, take assessments, and run live AI interviews; recruiters post jobs, screen applicants, and hire.

This monorepo holds the three services that make up the product.

## Services

| Service | Path | Stack | Port (dev) | Deploy |
| --- | --- | --- | --- | --- |
| **Frontend** | `frontend/` | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui | 3000 | Vercel |
| **Backend** | `backend/` | Django 4.2 + DRF + Celery + Channels (Daphne ASGI) | 8000 | Render (web + worker + beat) |
| **AI** | `ai/` | FastAPI + LangChain + OpenAI | 9000 | Render (or local) |

```
tiaago-monorepo/
├── frontend/      # Next.js app
├── backend/       # Django + Celery + Channels
├── ai/            # FastAPI resume-screening & assessment service
└── render.yaml    # Render Blueprint — provisions backend web/worker/beat + AI
```

## Architecture

```
                  ┌──────────────────┐
                  │   Frontend       │
                  │   (Next.js)      │
                  └────────┬─────────┘
                           │  REST + JWT cookies
                           │  WebSocket (?token=jwt)
                           ▼
                  ┌──────────────────┐
                  │   Backend        │
                  │   (Django)       │
                  │                  │      ┌──────────────────┐
                  │   web  ────────► │─────►│   AI             │
                  │   worker         │ X-Service-Key │   (FastAPI)      │
                  │   beat           │      └──────────────────┘
                  └────┬─────────────┘
                       │ Redis (broker + cache + channels)
                       ▼
                  ┌──────────────────┐
                  │  Postgres + Redis│
                  └──────────────────┘
```

- **Frontend ↔ Backend**: JWT in httpOnly cookies (`tiaago_access`, `tiaago_refresh`); WebSocket auth via `?token=<jwt>`.
- **Backend ↔ AI**: Backend calls the AI service with an `X-Service-Key` shared secret.
- **Backend → Postgres / Redis**: standard env-var URL config.

## Local development

You need three terminals (or use `tmux` / your IDE's run configs).

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # fill in DB_URL, REDIS_URL, SECRET_KEY
python manage.py migrate
python manage.py runserver                           # → http://localhost:8000
```

In a second terminal, start Celery:

```bash
cd backend
source .venv/bin/activate
celery -A talentsync_backend worker -l info
celery -A talentsync_backend beat   -l info
```

### 2. AI service

See `ai/README.md` for full details. Short version:

```bash
cd ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=...
uvicorn app.main:app --reload --port 9000           # → http://localhost:9000
```

### 3. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local                           # set NEXT_PUBLIC_API_BASE_URL
pnpm dev                                             # → http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000` and the AI service (called indirectly via the backend) at `http://localhost:9000` by default.

## Deployment

The monorepo is wired for two hosts:

- **Vercel** for the frontend (root directory = `frontend`)
- **Render Blueprint** for the backend (one image, three services: web, worker, beat — distinguished by the `ROLE` env var) and the AI service

End-to-step-by-step runbook lives at the repo root: `../DEPLOY-GUIDE.md`. It covers where to get every required env var (Stripe, Paystack, Flutterwave, ConvertKit, Daily.co, ElevenLabs, Deepgram, Sentry), and how to wire payments and external services per-provider.

A consolidated map of every env var, every workflow, and every cross-service integration lives at `../ENV-AND-WORKFLOWS.md`.

## Project layout (detail)

```
tiaago-monorepo/
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # shared UI
│   ├── lib/                 # axios client, auth helpers
│   ├── public/              # static assets
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── talentsync_backend/  # Django project (settings, urls, celery, asgi)
│   ├── case_study_projects/ # Django app
│   ├── chats/               # Django app (Channels consumers)
│   ├── contract/            # Django app
│   ├── create_user/         # Django app (auth + CustomUser)
│   ├── jobs/                # Django app
│   ├── payments/            # Django app (Stripe / Paystack / Flutterwave)
│   ├── quiz/                # Django app
│   ├── roles/               # Django app
│   ├── scheduler/           # Django app
│   ├── skill_assessment/    # Django app
│   ├── subscriptions/       # Django app
│   ├── work_experience/     # Django app
│   ├── management/          # custom management commands
│   ├── marketing/           # ConvertKit glue
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile           # used by Render
│   └── .env.example
│
├── ai/
│   ├── app/
│   │   ├── api/             # FastAPI routes
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # resume analyzer, assessment generator
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile           # used by Render (optional)
│   ├── requirements.txt
│   └── README.md            # full AI service docs
│
├── render.yaml              # Render Blueprint (backend + AI)
└── .gitignore
```

## License

Private / unlicensed.
