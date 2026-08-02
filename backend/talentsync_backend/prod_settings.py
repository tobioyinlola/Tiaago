import environ
import os
from pathlib import Path
from loguru import logger
import dj_database_url


env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent
# .env is read once at startup (no overwrite of real environment)
_managed_env = os.path.join(BASE_DIR, ".env")
if os.path.isfile(_managed_env):
    environ.Env.read_env(_managed_env, overwrite=False)

# SECRET_KEY is required in production; no silent empty default
SECRET_KEY = env("SECRET_KEY")
DATABASE_URL = env("DB_URL", default="")
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/1")
DAILY_API_TOKEN = env("DAILY_API_TOKEN", default="")
SENTRY_DSN = env("SENTRY_DSN", default="")
BETTERSTACK_SOURCE_TOKEN = env("BETTERSTACK_SOURCE_TOKEN", default="")
BETTERSTACK_HOST = env("BETTERSTACK_HOST", default="")

# Feature flags for production
#CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "1") in ("1", "true", "True")

# Static files: WhiteNoise serves /static/ from STATIC_ROOT, which collectstatic
# populates during the render.yaml releaseCommand.
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS: list = []  # collected artifacts only; no source dir at this level




import sentry_sdk

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.05,
        profiles_sample_rate=0.05,
        environment="production",
    )

DEBUG = False

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Tiaago <support@email.tiaago.com>")

ALLOWED_HOSTS = [h.strip() for h in env.list("ALLOWED_HOSTS", default=[
    "127.0.0.1",
    "localhost",
    "api.tiaago.com",
    "www.tiaago.com",
    "tiaago.com",
    # Render's own domain — uptime pings and direct API access use it.
    "tiaago-backend-web.onrender.com",
]) if h.strip()]

CSRF_TRUSTED_ORIGINS = [o.strip() for o in env.list("CSRF_TRUSTED_ORIGINS", default=[
    "https://tiaago.com",
    "https://www.tiaago.com",
    "https://api.tiaago.com",
]) if o.strip()]

# Strict CORS: explicit list + regex only. No wildcard.
CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://([a-z0-9-]+\.)?tiaago\.com$",
]
CORS_ALLOW_CREDENTIALS = True
CORS_PREFLIGHT_MAX_AGE = 86400


SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE   = "None"
SESSION_COOKIE_SECURE  = True
CSRF_COOKIE_SECURE     = True

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


DATABASES = {
    "default": dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=0,
        ssl_require=True,
    )
}
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# Redis Caching for Production
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 20,
                "decode_responses": False,
            }
        }
    }
}

# Session and Cache Configuration
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# Production Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'talentsync_backend': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

if BETTERSTACK_SOURCE_TOKEN:
    _logtail_handler = {
        "class": "logtail.LogtailHandler",
        "source_token": BETTERSTACK_SOURCE_TOKEN,
    }
    if BETTERSTACK_HOST:
        _logtail_handler["host"] = f"https://{BETTERSTACK_HOST}"
    LOGGING["handlers"]["logtail"] = _logtail_handler
    if "root" in LOGGING:
        LOGGING["root"]["handlers"].append("logtail")
    for _logger_cfg in LOGGING.get("loggers", {}).values():
        _logger_cfg["handlers"].append("logtail")

# Performance Settings
USE_TZ = True
USE_I18N = True
USE_L10N = True

# Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Rate Limiting (basic).
# NOTE: merged into the base REST_FRAMEWORK by settings.py — defining
# REST_FRAMEWORK here would replace the whole dict and silently drop
# DEFAULT_PERMISSION_CLASSES (IsUserVerified), parsers, and versioning.
REST_FRAMEWORK_OVERRIDES = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        # Scoped rates for talent_network's public join/confirm endpoints --
        # this dict REPLACES (not merges into) the base settings.py value via
        # REST_FRAMEWORK.update(REST_FRAMEWORK_OVERRIDES), so these have to be
        # repeated here or they'd silently disappear in production.
        'talent_network_join': '5/hour',
        'talent_network_confirm': '20/hour',
        'job_apply': '20/hour',
        'assessment_generation': '10/hour',
        'question_bank_generation': '10/hour',
    }
}

# WhiteNoise (STATIC only)
"""STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False"""

#swagger settings
SWAGGER_SETTINGS = {
    "USE_SESSION_AUTH": False,
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
        }
    },
}
