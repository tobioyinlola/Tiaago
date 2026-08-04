# TIAAGO

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v2/monitor/2p25o.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

Talent marketplace connecting African developers with startups. Candidates build profiles, take assessments, and run live AI interviews; recruiters post jobs, screen applicants, and hire.

## Services

| Service | Path | Stack | Dev port | Production |
| --- | --- | --- | --- | --- |
| **Frontend** | `frontend/` | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | 3000 | Vercel |
| **Backend** | `backend/` | Django 4.2, DRF, Celery, Channels (Daphne ASGI) | 8000 | EC2 (Docker Compose) |
| **AI** | `ai/` | FastAPI, LangChain, OpenAI | 9000 | EC2 (Docker Compose) |
| **Interview agent** | `interview_agent/` | Python, LiveKit Agents, OpenAI (Whisper/GPT-4o/TTS) | n/a (worker, no HTTP port) | EC2 (Docker Compose) |

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
- **AI interviews**: candidate's browser connects directly to LiveKit Cloud (not through Nginx) using a token minted by the backend; `interview_agent/` also connects directly to LiveKit and talks back to the backend's internal endpoints via an `X-Internal-Key` shared secret. Question generation and post-interview scoring are stateless calls from the backend to the `ai/` service, same as every other AI feature.
- **Production**: EC2 t3.small, Docker Compose (web, worker, beat, ai, interview-agent, nginx). GitHub Actions deploys on push to `main`.

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

### Interview agent (AI interviews)

Standalone worker, not an HTTP service -- joins each AI interview's LiveKit
room and conducts it (OpenAI Whisper STT, GPT-4o, OpenAI TTS voice "nova").

```bash
cd interview_agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # LIVEKIT_URL/API_KEY/API_SECRET, OPENAI_API_KEY, INTERNAL_API_KEY (must match backend's), NEXTJS_INTERNAL_URL (despite the name, this is the Django backend's base URL, e.g. http://localhost:8000)
python agent.py download-files   # one-time: fetches the Silero VAD model
python agent.py dev              # or `start` for production
```

**LiveKit free tier**: 10,000 connection-minutes/month. A single AI interview
occupies 2 participants (candidate + agent) for its duration, so LiveKit
bills roughly `2 x duration_minutes` per interview -- e.g. a 10-minute
interview uses ~20 of those 10,000 minutes, meaning the free tier covers
roughly ~500 ten-minute interviews/month before LiveKit usage-based billing
kicks in.

**Estimated cost per interview** (10-minute default): LiveKit audio ~$0.006,
OpenAI Whisper STT ~$0.006/min (~$0.06), GPT-4o conversation ~$0.15, OpenAI
TTS (nova) ~$0.02 -- roughly **$0.24/interview**, before LiveKit's own
usage-based billing past the free tier above. Question generation and
post-interview scoring (both one-off GPT-4o calls per interview, not
per-minute) add a small, roughly fixed amount on top.

**livekit-agents limitations hit during this build**: the framework's
transcript-capture API has moved on from the `on_agent_speech_committed`
hook older examples reference -- current versions (`livekit-agents` 1.x)
use the `AgentSession`-level `conversation_item_added` event for both
speaker roles instead (see `interview_agent/agent.py`'s
`_on_conversation_item_added`), and `RoomInputOptions.noise_cancellation`
takes a processor object, not a bare `True` (omitted here since LiveKit
Cloud's enhanced noise cancellation is a separate opt-in plugin/package).

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
