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
        traces_sample_rate=1.0,
        _experiments={
            "continuous_profiling_auto_start": True,
        },
        environment="production",
    )

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in env.list("ALLOWED_HOSTS", default=[
    "127.0.0.1",
    "localhost",
    "api.tiaago.com",
    "www.tiaago.com",
    "tiaago.com",
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
CORS_ALLOW_CREDENTIALS = False


SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE   = "None"
SESSION_COOKIE_SECURE  = True
CSRF_COOKIE_SECURE     = True

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


DATABASES = {
    "default": dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        ssl_require=True,
    )
}

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

# Performance Settings
USE_TZ = True
USE_I18N = True
USE_L10N = True

# Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Rate Limiting (basic)
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
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
