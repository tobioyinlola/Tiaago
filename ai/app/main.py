# app/main.py
import logging
from fastapi import FastAPI, Depends, Header, HTTPException
from app.api.routes import router as api_router
from app.config import settings
from fastapi.middleware.cors import CORSMiddleware

_root = logging.getLogger()
_root.setLevel(logging.INFO)
if not any(isinstance(h, logging.StreamHandler) for h in _root.handlers):
    _root.addHandler(logging.StreamHandler())

if settings.BETTERSTACK_SOURCE_TOKEN:
    from logtail import LogtailHandler
    _handler_kwargs = {"source_token": settings.BETTERSTACK_SOURCE_TOKEN}
    if settings.BETTERSTACK_HOST:
        _handler_kwargs["host"] = f"https://{settings.BETTERSTACK_HOST}"
    _root.addHandler(LogtailHandler(**_handler_kwargs))

app = FastAPI(
    title="Resume Analysis and Assessment API",
    description="API for analyzing resumes and generating assessments",
    version="1.0.0",
)


def require_service_key(x_service_key: str | None = Header(default=None)) -> None:
    """Dependency: enforce X-Service-Key on every API call.

    AI_SERVICE_API_KEY must be set in any deployed environment. When unset,
    auth is skipped only in development; in production (ENV=production, set
    by render.yaml) requests are rejected outright so a missing key can never
    leave the service open to the public.
    """
    expected = settings.AI_SERVICE_API_KEY
    if not expected:
        if settings.ENV == "production":
            raise HTTPException(
                status_code=503,
                detail="service auth not configured: set AI_SERVICE_API_KEY",
            )
        return  # auth disabled (local dev only)
    if not x_service_key or x_service_key != expected:
        raise HTTPException(status_code=401, detail="invalid or missing X-Service-Key")


# All /api/v1/* routes require the service key. Health and root stay public.
app.include_router(
    api_router,
    prefix="/api/v1",
    dependencies=[Depends(require_service_key)],
)

# CORS: locked to the configured allow-list (default: localhost:8000 for dev).
# Override CORS_ORIGINS env var per environment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)