# staging_settings.py
import os
from pathlib import Path
from loguru import logger
from corsheaders.defaults import default_headers, default_methods

BASE_DIR = Path(__file__).resolve().parent.parent


# ---------- Logging (lean console) ----------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "level": "DEBUG",  
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "formatters": {
        "simple": {
            "format": "[{asctime}] [{levelname}] {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "skill_assessment": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "chats": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "chats.consumers": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "channels": {"handlers": ["console"], "level": "DEBUG", "propagate": False},  
        "channels_redis": {"handlers": ["console"], "level": "DEBUG", "propagate": False},  
        "auth_middleware": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "django.db.backends": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "scheduler": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}


# ---------- Feature flags for staging ----------
# Disable heavy external services by default in staging
OPENAI_API_KEY = ""
ELEVENLABS_API_KEY = ""
DEEPGRAM_API_KEY = ""
DAILY_API_TOKEN = os.getenv("DAILY_API_TOKEN", "")

# If you want tasks to run inline in staging (fast, predictable):
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "1") in ("1", "true", "True")



try:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ("rest_framework.renderers.JSONRenderer",)
    REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"] = "rest_framework.pagination.PageNumberPagination"
    REST_FRAMEWORK["PAGE_SIZE"] = 20
    REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ]
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"anon": "100/minute", "user": "1000/minute"}
except NameError:
    REST_FRAMEWORK = {
        "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 20,
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": {"anon": "100/minute", "user": "1000/minute"},
    }

REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
    "rest_framework_simplejwt.authentication.JWTAuthentication",
    "rest_framework.authentication.BasicAuthentication",
]

DEBUG = True

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = list(default_headers) + ["x-csrftoken", "authorization"]
CORS_ALLOW_METHODS = list(default_methods)

# ---------- Email ----------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
DEFAULT_FROM_EMAIL = "Tiaago Staging <no-reply@tiaago.com>"

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,staging.tiaago.com,tiaago-v2-backend-production.up.railway.app",
).split(",")

_csrf_env = os.environ.get("CSRF_TRUSTED_ORIGINS", "")
CSRF_TRUSTED_ORIGINS = [x.strip() for x in _csrf_env.split(",") if x.strip()]
if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        "https://www.tiaago.com",
        "https://tiaago-v2-frontend.fly.dev",
        "https://tiaago-v2-backend-production.up.railway.app",
    ]

ALLOWED_WEBSOCKET_ORIGINS = [
     "https://tiaago-v2-backend-production.up.railway.app", 
     "https://tiaago-v2-frontend.fly.dev",]



# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = bool(int(os.getenv("SECURE_SSL_REDIRECT", "0")))

# ---------- Redis + Cache (with graceful fallback) ----------
def _normalize_redis_url(raw: str, default: str = "redis://localhost:6379/1") -> str:
    if not raw:
        return default
    if "://" not in raw:
        host_port, _, db = raw.partition("/")
        host, _, port = host_port.partition(":")
        host = host or "localhost"
        port = port or "6379"
        db = db or "1"
        return f"redis://{host}:{port}/{db}"
    return raw

RAW_REDIS_URL = os.environ.get("REDIS_URL", "")
REDIS_URL = _normalize_redis_url(RAW_REDIS_URL)
# Log host/port/db only, never credentials
from urllib.parse import urlparse as _urlparse
_rp = _urlparse(REDIS_URL)
logger.info(f"Using Redis: {_rp.hostname or 'localhost'}:{_rp.port or 6379}/{(_rp.path or '/1').lstrip('/') or '1'}")

def _build_cache():
    try:
        import redis  # noqa: F401
        return {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "pool_class": "redis.BlockingConnectionPool",
                "max_connections": int(os.getenv("REDIS_MAX_CONNECTIONS", 200)),
                "timeout": int(os.getenv("REDIS_POOL_TIMEOUT", 5)),
                "socket_timeout": int(os.getenv("REDIS_SOCKET_TIMEOUT", 3)),
                "socket_connect_timeout": int(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", 3)),
                "retry_on_timeout": True,
            },
            "TIMEOUT": 300,
        }
    except Exception as e:
        logger.warning(f"Redis unreachable in staging, falling back to LocMem: {e}")
        return {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "staging-fallback",
            "TIMEOUT": 300,
        }

CACHES = {"default": _build_cache()}
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"


#CHANNELS LAYERS
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL], 
        },
    }
}

# ---------- Celery wiring (harmless if ALWAYS_EAGER=True) ----------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "django-db")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Lagos"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60

# ---------- DB pooling flag (read by your code, if any) ----------
DATABASE_CONNECTION_POOLING = True

# ---------- Static files (WhiteNoise) ----------
#STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True


SILENCED_SYSTEM_CHECKS = [
    "security.W019",
]

# ---------- Sessions ----------
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_SAVE_EVERY_REQUEST = False
SESSION_EXPIRE_AT_BROWSER_CLOSE = True


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]


#SWAGGER SETTINGS

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