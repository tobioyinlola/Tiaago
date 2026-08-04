# Standalone LiveKit voice-agent process for the AI interview feature.
# Sibling deployable to ../ai (the FastAPI generation service) -- this one
# holds a persistent realtime STT/LLM/TTS pipeline per interview instead of
# handling stateless request/response calls, so it runs as its own worker
# process rather than an HTTP service (see agent.py's `agents.cli.run_app`).
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .

# Pre-downloads the Silero VAD model into the image so the worker doesn't
# fetch it on first job (livekit-agents convention -- see `download-files`).
RUN python agent.py download-files

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["python", "agent.py", "start"]
