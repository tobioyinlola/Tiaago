# app/main.py
from fastapi import FastAPI, Depends, Header, HTTPException
from app.api.routes import router as api_router
from app.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Resume Analysis and Assessment API",
    description="API for analyzing resumes and generating assessments",
    version="1.0.0",
)


def require_service_key(x_service_key: str | None = Header(default=None)) -> None:
    """Dependency: enforce X-Service-Key on every API call (skips no-op if key is unset).

    Set AI_SERVICE_API_KEY in the environment to enable auth. When unset (e.g. local dev),
    the dependency is a no-op and the service is open. In any deployed env, the key MUST
    be set — otherwise the service is effectively unauthenticated.
    """
    expected = settings.AI_SERVICE_API_KEY
    if not expected:
        return  # auth disabled (dev only)
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