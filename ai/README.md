# TIAAGO AI Service

FastAPI service for resume analysis, assessment generation, and culture fit evaluation.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # set OPENAI_API_KEY
uvicorn app.main:app --reload --port 9000
```

Docs at `http://localhost:9000/docs`.

## Endpoints

- `POST /api/v1/analyze-resume/` - score resume against job description
- `POST /api/v1/assess` - generate technical assessment
- `POST /api/v1/grade-coding-assessment` - grade coding submission
- `POST /api/v1/culture-fit-assessment` - generate culture fit questions
- `POST /api/v1/generate-coding-assessment` - language-specific coding assessment
- `GET /api/v1/health` - health check

## Auth

`X-Service-Key` header required in production. Disabled in dev. Only the backend calls this service.

## Config

| Var | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | required | OpenAI API key |
| `OPENAI_MODEL_NAME` | `gpt-4o-mini` | model to use |
| `AI_SERVICE_API_KEY` | required in prod | shared secret with backend |
| `ENV` | `development` | `development` / `production` |
| `CORS_ORIGINS` | `http://localhost:8000` | allowed origins |

## Production

Runs on EC2 alongside the backend via Docker Compose. Backend connects at `http://ai:8000` (Docker internal network).

## Tests

```bash
pytest tests/
pytest tests/test_file.py::test_name
```
