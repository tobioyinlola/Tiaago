# TIAAGO

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v2/monitor/2p25o.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

Talent marketplace connecting African developers with startups. Candidates build profiles, take assessments, and run live AI interviews; recruiters post jobs, screen applicants, and hire.

## Services

| Service | Path | Stack | Dev port | Production |
| --- | --- | --- | --- | --- |
| **Frontend** | `frontend/` | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | 3000 | Vercel |
| **Backend** | `backend/` | Django 4.2, DRF, Celery, Channels (Daphne ASGI) | 8000 | EC2 (Docker Compose) |
| **AI** | `ai/` | FastAPI, LangChain, OpenAI | 9000 | EC2 (Docker Compose) |

## Architecture

```
Frontend (Vercel)
    |
    | REST + JWT cookies / WebSocket
    v
Nginx (SSL termination)
    |
    +---> Backend (Django/Daphne)  ---> AI service (FastAPI)
    |         |                          X-Service-Key auth
    |         v
    |    Redis (broker + cache + channels)
    |    Postgres (Supabase)
    v
Static + Media files
```

- **Frontend -> Backend**: JWT in httpOnly cookies; WebSocket auth via `?token=<jwt>`.
- **Backend -> AI**: `X-Service-Key` shared secret. Frontend never calls AI directly.
- **Production**: EC2 t3.small, Docker Compose (web, worker, beat, ai, nginx). GitHub Actions deploys on push to `main`.

## Local development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill DB_URL, REDIS_URL, SECRET_KEY
python manage.py migrate
python manage.py runserver
```

Celery (separate terminal):
```bash
celery -A talentsync_backend worker -l info
celery -A talentsync_backend beat -l info
```

### AI service

```bash
cd ai
pip install -r requirements.txt
export OPENAI_API_KEY=...
uvicorn app.main:app --reload --port 9000
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
pnpm dev
```

## Deployment

- **Frontend**: Vercel auto-deploys on push to `main` (public repo, Git integration).
- **Backend + AI**: EC2 instance running Docker Compose behind Nginx with Let's Encrypt SSL. GitHub Actions CI/CD (`.github/workflows/deploy-backend.yml`) SSHes into EC2 on push to `main` when `backend/`, `ai/`, `docker-compose.yml`, or `nginx/` change.
- **Database**: Supabase (Postgres, transaction pooler port 6543).
- **Redis**: Render managed Redis (external access).

## License

Private / unlicensed.
