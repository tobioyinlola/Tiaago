#!/usr/bin/env bash
set -euo pipefail

# ── Config from env ───────────────
ROLE="${ROLE:-web}"                       # web | worker | beat
ENVIRONMENT="${ENV:-production}"
DEBUG="${DEBUG:-0}"

PORT="${PORT:-8000}"                      # Railway injects PORT for web
MIGRATE_ON_START="${MIGRATE_ON_START:-0}"
COLLECTSTATIC_ON_START="${COLLECTSTATIC_ON_START:-0}"

CELERY_APP="${CELERY_APP:-talentsync_backend}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-2}"
CELERY_MAX_TASKS_PER_CHILD="${CELERY_MAX_TASKS_PER_CHILD:-100}"
CELERY_LOGLEVEL="${CELERY_LOGLEVEL:-info}"
CELERY_EXTRA_OPTS="${CELERY_EXTRA_OPTS:-}"  

echo "==> ROLE=${ROLE} ENV=${ENVIRONMENT} DEBUG=${DEBUG} PORT=${PORT}"

# ── One-off ops ─────────
if [[ "${MIGRATE_ON_START}" == "1" ]]; then
  echo "==> Running migrations..."
  python manage.py migrate --noinput
fi

if [[ "${COLLECTSTATIC_ON_START}" == "1" ]]; then
  echo "==> Collecting static..."
  python manage.py collectstatic --noinput
fi

# Sanity log for MEDIA 
python - <<'PY'
import os
root = os.environ.get("MEDIA_ROOT", "/home/app/web/media")
print(f"==> [media-check] exists={os.path.exists(root)} isdir={os.path.isdir(root)} path={root}")
try:
    print("==> [media-check] sample:", os.listdir(root)[:10])
except Exception as e:
    print("==> [media-check] list error:", e)
PY

# ── Dispatch by ROLE ───────────────
case "${ROLE}" in
  web)
    if [[ "${DEBUG}" == "1" ]]; then
      echo "==> Starting Django dev server on 0.0.0.0:${PORT}"
      exec python manage.py runserver 0.0.0.0:"${PORT}"
    else
      echo "==> Starting Daphne (ASGI) on 0.0.0.0:${PORT}"
      exec daphne -b 0.0.0.0 -p "${PORT}" "${CELERY_APP}.asgi:application"

      echo "==> Rendering nginx.conf with PORT=${PORT}"
      envsubst '${PORT}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf

      echo "==> Starting Nginx (front proxy, WebSocket-enabled) on ${PORT}"
      exec nginx -g 'daemon off;'
    fi
    ;;

  worker)
    echo "==> Starting Celery WORKER (app=${CELERY_APP})"
    echo "    concurrency=${CELERY_CONCURRENCY} max_tasks_per_child=${CELERY_MAX_TASKS_PER_CHILD} loglevel=${CELERY_LOGLEVEL}"
    exec celery -A "${CELERY_APP}" worker -l "${CELERY_LOGLEVEL}" \
      --concurrency="${CELERY_CONCURRENCY}" \
      --max-tasks-per-child="${CELERY_MAX_TASKS_PER_CHILD}" \
      ${CELERY_EXTRA_OPTS}
    ;;

  beat)
    echo "==> Starting Celery BEAT (app=${CELERY_APP})"
    exec celery -A "${CELERY_APP}" beat -l "${CELERY_LOGLEVEL}" ${CELERY_EXTRA_OPTS}
    ;;

  *)
    echo "!! Unknown ROLE='${ROLE}'. Use one of: web | worker | beat"
    exit 1
    ;;
esac
