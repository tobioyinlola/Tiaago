# ─────────────────────────────────────────────
# STAGE 1: builder (compile wheels, cache deps)
# ─────────────────────────────────────────────
FROM python:3.11.4-slim-bullseye AS builder
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps needed to build common Python libs (psycopg, pillow, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Leverage layer caching: copy just requirements first
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# ─────────────────────────────────────────────
# STAGE 2: runtime (small, only what we need)
# ─────────────────────────────────────────────
FROM python:3.11.4-slim-bullseye AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/app \
    APP_HOME=/home/app/web
WORKDIR $APP_HOME

# Runtime libs only (keep image small)
# - libmagic1: you used python-magic
# - curl: optional, handy for HEALTHCHECKs/logs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 curl \
 && rm -rf /var/lib/apt/lists/*

 
#COPY nginx.conf /etc/nginx/templates/nginx.conf
# Install Python wheels built in the builder stage
COPY --from=builder /wheels /wheels
RUN pip install --upgrade pip \
 && pip install --no-cache-dir /wheels/*

# Copy project
COPY . $APP_HOME


RUN chmod +x $APP_HOME/entrypoint.sh


RUN mkdir -p $APP_HOME/staticfiles $APP_HOME/static $APP_HOME/media

# Collect static files at build time so the container starts faster.
# SECRET_KEY is the only env var with no default (for security), so we
# pass a throwaway value. All other vars have safe defaults in settings.py.
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput

# Copy your nginx config (template uses ${PORT}; otherwise copy to /etc/nginx/nginx.conf directly)
COPY nginx.conf /etc/nginx/templates/nginx.conf

EXPOSE 10000

# Keep the container PID 1 as your entrypoint (uses $PORT inside)
ENTRYPOINT ["./entrypoint.sh"]
