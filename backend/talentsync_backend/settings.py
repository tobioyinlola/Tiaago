import dj_database_url
import environ
import os
from pathlib import Path
from datetime import timedelta
import warnings
import json
from loguru import logger
from decimal import Decimal

warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ENV=(str, "development"),
)

ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    environ.Env.read_env(str(ENV_FILE))  # local-only .env

SECRET_KEY = env("SECRET_KEY")
ENV = env("ENV")          # "development" | "staging" | "production"
DEBUG = env("DEBUG")

BETTERSTACK_SOURCE_TOKEN = env("BETTERSTACK_SOURCE_TOKEN", default="")
BETTERSTACK_HOST = env("BETTERSTACK_HOST", default="")



ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    'tiaago-v2-backend-production.up.railway.app',
    'https://tiaago-backend-prod-96327534155.us-central1.run.app',
    
    # ngrok url to test my webhook locally
    '409ae903a196.ngrok-free.app', 
]



INSTALLED_APPS = [
    "daphne",
    # django apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # local apps
    "case_study_projects.apps.CaseStudyProjectsConfig",
    "contract.apps.ContractConfig",
    "create_user.apps.CreateUserConfig",
    "jobs.apps.JobsConfig",
    "payments.apps.PaymentsConfig",
    "quiz.apps.QuizConfig",
    "roles.apps.RolesConfig",
    "scheduler.apps.SchedulerConfig",
    "skill_assessment.apps.SkillAssessmentConfig",
    "subscriptions.apps.SubscriptionsConfig",
    "work_experience.apps.WorkExperienceConfig",
    "chats.apps.ChatsConfig",
    "management",
    "marketing.apps.MarketingConfig",
    "emails_app.apps.EmailsAppConfig",
    "sourcing.apps.SourcingConfig",
    "blog.apps.BlogConfig",
    "analytics.apps.AnalyticsConfig",
    "support.apps.SupportConfig",
    "notifications.apps.NotificationsConfig",
    "proctoring.apps.ProctoringConfig",
    "tags.apps.TagsConfig",
    "segments.apps.SegmentsConfig",
    "campaigns.apps.CampaignsConfig",
    "staff.apps.StaffConfig",
    "ats_integrations.apps.AtsIntegrationsConfig",
    "talent_network.apps.TalentNetworkConfig",
    "ai_interviews.apps.AiInterviewsConfig",
    # 3rd party apps
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "corsheaders",
    "django_celery_beat",
    "django_celery_results",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "drf_yasg",
    "phonenumber_field",
    "pipecat",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "django_bunny",
    "ckeditor",
    "ckeditor_uploader",
]

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

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ROOT_URLCONF = "talentsync_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", BASE_DIR / "emails" / "email_templates" / "talents" , BASE_DIR / "emails" / "email_templates" / "recruiters"],
        "APP_DIRS": True,
        "OPTIONS": {
            "builtins": ["django.templatetags.static"], 
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
            
        },
    },
    
]

WSGI_APPLICATION = "talentsync_backend.wsgi.application"
ASGI_APPLICATION = "talentsync_backend.asgi.application"



DB_URL= env("DB_URL", default="")

if DB_URL:
    # For regular database URLs (non-Cloud SQL)
    DATABASES = {
        'default': dj_database_url.config(
            default=DB_URL,
            conn_max_age=600,
            ssl_require=False
        )
    }
    # DB_URL must use the Supabase transaction pooler (port 6543): the session
    # pooler (5432) caps at 15 clients, which web threads + worker + beat exhaust.
    # Transaction pooling forbids server-side cursors, and the pooler may drop
    # idle persistent connections, so health-check before reuse.
    DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True
    # Log the database host/scheme only — never the password
    from urllib.parse import urlparse
    _p = urlparse(DB_URL)
    logger.info(f"Database configured: scheme={_p.scheme} host={_p.hostname} db={(_p.path or '/').lstrip('/')}")
else:
    # Fallback for development - use SQLite if no database URL is provided
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    logger.warning("No database URL provided, using SQLite for development")

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Africa/Lagos"

USE_I18N = True

USE_TZ = True

# ---------- Static & Media (Bunny toggle) ----------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Django 5.1+: configure storages via STORAGES (do NOT set DEFAULT_FILE_STORAGE)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# File storage: S3 (production), Bunny (legacy), or local filesystem (dev)
USE_S3 = env.bool("USE_S3", default=False)
USE_BUNNY = env.bool("USE_BUNNY", default=False)

if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="tiaago-uploads")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="eu-west-3")
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False

    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    }

    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    MEDIA_ROOT = BASE_DIR / "media"

elif USE_BUNNY:
    BUNNY_USERNAME=env("BUNNY_USERNAME")
    BUNNY_PASSWORD = env("BUNNY_PASSWORD")
    BUNNY_STORAGE_NAME=env("BUNNY_USERNAME")
    BUNNY_STORAGE_PASSWORD=env("BUNNY_PASSWORD")
    BUNNY_REGION   = env("BUNNY_REGION", default="jh")
    BUNNY_MEDIA_URL = env("BUNNY_MEDIA_URL")

    if not BUNNY_MEDIA_URL.endswith("/"):
        BUNNY_MEDIA_URL += "/"

    STORAGES["default"] = {
        "BACKEND": "django_bunny.storage.BunnyStorage",
    }

    MEDIA_URL = BUNNY_MEDIA_URL
    MEDIA_ROOT = BASE_DIR / "media"

else:
    STORAGES["default"] = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    }
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"


# CKEditor -- rich text authoring for blog posts (images + link embeds) in Django admin.
# Uploads flow through whichever STORAGES["default"] backend is active above.
CKEDITOR_UPLOAD_PATH = "blog_uploads/"
CKEDITOR_IMAGE_BACKEND = "pillow"
CKEDITOR_CONFIGS = {
    "default": {
        "toolbar": "Custom",
        "toolbar_Custom": [
            ["Format", "Bold", "Italic", "Underline", "Strike"],
            ["NumberedList", "BulletedList", "Blockquote"],
            ["Link", "Unlink", "Image"],
            ["Undo", "Redo"],
            ["Source"],
        ],
        "height": 400,
        "width": "100%",
    },
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "create_user.CustomUser"

LOGIN_URL = "login"

DEFAULT_RENDERER_CLASSES = ("rest_framework.renderers.JSONRenderer",)
if DEBUG:
    DEFAULT_RENDERER_CLASSES += ("rest_framework.renderers.BrowsableAPIRenderer",)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # 'rest_framework.authentication.SessionAuthentication',
        "rest_framework.authentication.TokenAuthentication",
        "create_user.authentication.CachedJWTCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
        "subscriptions.permissions.IsUserVerified",
    ],
    "DEFAULT_RENDERER_CLASSES": DEFAULT_RENDERER_CLASSES,
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FileUploadParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.QueryParameterVersioning",
    "DEFAULT_VERSION": "1",
    "ALLOWED_VERSIONS": ("1", "2"),
    "VERSION_PARAM": "v",
    # 'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    # 'PAGE_SIZE': 25,
    # Scoped throttle rates for specific public, unauthenticated endpoints --
    # see talent_network.views (public join/confirm forms). The blanket
    # anon/user rates below only apply in prod_settings.py/staging_settings.py;
    # these scope-specific rates apply in every environment since they guard
    # a dedicated abuse-prone endpoint rather than general API traffic.
    "DEFAULT_THROTTLE_RATES": {
        "talent_network_join": "5/hour",
        "talent_network_confirm": "20/hour",
        # Guest/candidate-facing apply endpoints and the AI-heavy assessment
        # generation endpoints -- abuse-prone and otherwise unthrottled beyond
        # whatever blanket anon/user rate prod/staging apply. See
        # prod_settings.py/staging_settings.py for why these are repeated there.
        "job_apply": "20/hour",
        "assessment_generation": "10/hour",
        "question_bank_generation": "10/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
}

REST_AUTH = {
    "USER_DETAILS_SERIALIZER": "create_user.api.serializers.CustomUserSerializer",
    "USE_JWT": True,
    # Cookie names must match what the frontend reads. See
    # frontend/app/common/constants/index.ts (ACCESS_TOKEN_KEY / REFRESH_TOKEN_KEY).
    "JWT_AUTH_COOKIE": "tiaago_access",
    "JWT_AUTH_REFRESH_COOKIE": "tiaago_refresh",
    "JWT_AUTH_RETURN_EXPIRATION": True,
}

REST_AUTH_EMAIL_TEMPLATES = {
    "email_confirmation_signup_subject": "account/email/email_confirmation_signup_subject.html",
    "email_confirmation_subject": "account/email/email_confirmation_subject.html",
}

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env("EMAIL_PORT", cast=int, default=587)
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_SUBJECT_PREFIX = ""
DEFAULT_FROM_EMAIL = "Tiaago Dev <support@email.tiaago.com>"


SITE_ID = 1

GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")

ACCOUNT_ADAPTER = "create_user.adapters.NoRedirectAccountAdapter"

# ACCOUNT_ADAPTER = 'create_user.adapters.CustomAccountAdapter'
ACCOUNT_EMAIL_SUBJECT_PREFIX = ""
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = "none"
ACCOUNT_EMAIL_CONFIRMATION_HTML = True
ACCOUNT_CONFIRM_EMAIL_ON_GET = True

# CURRENCY_API_KEY
CURRENCY_PRIVATE_KEY = env("CURRENCY_PRIVATE_KEY", default="")

# RESUME VALIDATION
WHITELISTED_RESUME_FORMAT = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword"
}

# IMAGE VALIDATIONS
WHITELISTED_IMAGE_TYPES = {
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
}

UPLOAD_FILE_MAX_SIZE = 2 * 1024 * 1024  # 2MB
FILE_UPLOAD_HANDLERS = [
    "django.core.files.uploadhandler.TemporaryFileUploadHandler",
    "django.core.files.uploadhandler.MemoryFileUploadHandler",
]

DAILY_API_TOKEN = env("DAILY_API_TOKEN", default="")
ELEVENLABS_API_KEY = env("ELEVENLABS_API_KEY", default="")
OPENAI_API_KEY = env('OPENAI_API_KEY', default="")
DEEPGRAM_API_KEY = env('DEEPGRAM_API_KEY', default="")

# LiveKit -- used by ai_interviews.views to create rooms and mint candidate
# access tokens for the AI interview feature (Python livekit-api SDK, not
# the Node livekit-server-sdk).
LIVEKIT_URL = env("LIVEKIT_URL", default="")
LIVEKIT_API_KEY = env("LIVEKIT_API_KEY", default="")
LIVEKIT_API_SECRET = env("LIVEKIT_API_SECRET", default="")

# Shared secret the standalone interview_agent/ LiveKit process authenticates
# with when calling Django's internal ai_interviews endpoints (agent-data,
# segment, status, complete) -- see ai_interviews.permissions.HasInternalServiceKey.
INTERNAL_API_KEY = env("INTERNAL_API_KEY", default="")

# Server-side only -- used by ats_integrations.nango_client to call Nango's
# REST API (create connect sessions, proxy ATS requests, delete connections
# after a sync). Never expose this to the frontend. Nango's public-key
# frontend flow was retired in March 2025; the frontend only ever sees a
# short-lived Connect session token minted via this key, never the key itself.
NANGO_SECRET_KEY = env("NANGO_SECRET_KEY", default="")


CHANNEL_LAYERS = {
     "default": {
         "BACKEND": "channels_redis.core.RedisChannelLayer",
         "CONFIG": {
             "hosts": [env("REDIS_URL", default="redis://localhost:6379")],
         },
     },
 }

# CELERY
CELERY_TIMEZONE = "Africa/Lagos"
CELERY_RESULT_BACKEND = "django-db"
CELERY_TASK_TRACK_STARTED = True
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379")  # Use Redis as broker
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
if ENV == "development":
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

PHONENUMBER_DEFAULT_REGION = "NG"

# FOR THE TEMPLATE
# In production, these MUST be set via Render env vars — silent defaults
# will silently email users links to a wrong (or no) domain. We fail loudly
# at startup if they're missing in prod.
def _required_url_in_prod(env_key: str, default: str) -> str:
    val = os.environ.get(env_key, default)
    if not val:
        raise RuntimeError(f"{env_key} must be set in production (got empty value).")
    return val

TIAAGO_TALENT_LOGIN_URL = _required_url_in_prod(
    "TIAAGO_TALENT_LOGIN_URL", "https://www.tiaago.com/talents/signin"
)
TIAAGO_STARTUP_LOGIN_URL = _required_url_in_prod(
    # NOTE: env var key intentionally left as TIAAGO_STARTUP_LOGIN_URL -- if this
    # is overridden in prod, rename the env var there too before renaming the key
    # here, otherwise a configured custom URL silently reverts to this default.
    "TIAAGO_STARTUP_LOGIN_URL", "https://www.tiaago.com/recruiter/signin"
)
FRONTEND_URL = _required_url_in_prod("FRONTEND_URL", "https://www.tiaago.com/")
FRONTEND_BASE_URL = _required_url_in_prod("FRONTEND_BASE_URL", "https://www.tiaago.com")
TIAAGO_MAIL_SUPPORT = "mailto:support@Tiaago.com"

IS_PRODUCTION = ENV == "production"
IS_STAGING = ENV == "staging"
IS_DEV = ENV == "development"

logger.info(f"Environment:working on {ENV}")
logger.info(f"Environment:working on {FRONTEND_URL}")

# Prices for wallet deduction
PAYG_PRICES = {
    "resume_screening": {
        "ngn": Decimal("40.00"),
        "usd": Decimal("0.030"),
    },
    "assessment": {
        "ngn": Decimal("100.00"),
        "usd": Decimal("0.090"),
    }
}


if IS_PRODUCTION:
    from .prod_settings import *
    # prod_settings.py already sets CORS_ALLOWED_ORIGINS from CSRF_TRUSTED_ORIGINS.
    # Don't override it here — the previous version included a broken "https://.tiaago.com"
    # (leading dot, no subdomain) and a localhost origin, both of which silently broke CORS.
    # Merge throttling on top of the base config instead of replacing the dict,
    # which used to drop DEFAULT_PERMISSION_CLASSES (IsUserVerified) in prod.
    REST_FRAMEWORK.update(REST_FRAMEWORK_OVERRIDES)
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "create_user.authentication.CachedJWTCookieAuthentication",
    ]
elif IS_STAGING:
    from .staging_settings import *
    REST_FRAMEWORK.update(REST_FRAMEWORK_OVERRIDES)
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "create_user.authentication.CachedJWTCookieAuthentication",
    ]
else:
    CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "https://tiaago-v2-frontend.fly.dev"]
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "create_user.authentication.CachedJWTCookieAuthentication",
    ]


# exchange rate

USD_PRICE = env('USD_PRICE', default=1.0)
NAIRA_EXCHANGE_RATE = env('NAIRA_EXCHANGE_RATE', default=1600)

# payments
PAYSTACK_PRIVATE_KEY = env("PAYSTACK_PRIVATE_KEY", default="")
PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY", default="")
FLW_SEC_KEY = env("FLW_SEC_KEY", default="")
FLW_PUB_KEY = env("FLW_PUB_KEY", default="")
METER_NAME = env("METER_NAME", default="resume_analyzed_skill_assessment_and_screening")
DEFAULT_SERVICE_PRICING = {
    "resume_screening": 3,
    "non_technical_assessment": 5,
    "technical_assessment": 9,
    "interview": 60,
}

# Stripe
STRIPE_PUBLIC_KEY = env("STRIPE_PUBLIC_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET_KEY = env("STRIPE_WEBHOOK_SECRET_KEY", default="")
STRIPE_SUBSCRIPTION_WEBHOOK_KEY = env("STRIPE_SUBSCRIPTION_WEBHOOK_KEY", default="")

try:
    SERVICE_PRICING = json.loads(env("SERVICE_PRICING"))
except Exception:
    # Fallback if not set or invalid JSON
    SERVICE_PRICING = DEFAULT_SERVICE_PRICING

PAYSTACK_BASIC_PLAN_CODE_FOR_TALENTS = env("PAYSTACK_BASIC_PLAN_CODE_FOR_TALENTS", default="")
PAYSTACK_PREMIUM_PLAN_CODE_FOR_TALENTS = env("PAYSTACK_PREMIUM_PLAN_CODE_FOR_TALENTS", default="")
PAYSTACK_BASIC_PLAN_CODE_FOR_STARTUPS = env("PAYSTACK_BASIC_PLAN_CODE_FOR_STARTUPS", default="")
PAYSTACK_PREMIUM_PLAN_CODE_FOR_STARTUPS = env("PAYSTACK_PREMIUM_PLAN_CODE_FOR_STARTUPS", default="")
FLW_BASIC_PLAN_CODE_FOR_TALENTS = env("FLW_BASIC_PLAN_CODE_FOR_TALENTS", default="")
FLW_PREMIUM_PLAN_CODE_FOR_TALENTS = env("FLW_PREMIUM_PLAN_CODE_FOR_TALENTS", default="")
FLW_BASIC_PLAN_CODE_FOR_STARTUPS = env("FLW_BASIC_PLAN_CODE_FOR_STARTUPS", default="")
FLW_PREMIUM_PLAN_CODE_FOR_STARTUPS = env("FLW_PREMIUM_PLAN_CODE_FOR_STARTUPS", default="")
# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# usage billing with stripe
STRIPE_PUBLIC_KEY = env("STRIPE_PUBLIC_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_PRICE_ID_STANDARD_JOB_POSTING = env("STRIPE_PRICE_ID_STANDARD_JOB_POSTING", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
# usage billing with paystack
PAYG_NAIRA_EXCHANGE_RATE = env("PAYG_NAIRA_EXCHANGE_RATE", default=1600)

FRONTEND_SUCCESS_URL = _required_url_in_prod(
    "FRONTEND_SUCCESS_URL", "https://www.tiaago.com/payment/success"
)
FRONTEND_CANCEL_URL = _required_url_in_prod(
    "FRONTEND_CANCEL_URL", "https://www.tiaago.com/payment/cancel"
)
FRONTEND_CALLBACK_URL = _required_url_in_prod(
    "FRONTEND_CALLBACK_URL", "https://www.tiaago.com/payment/callback"
)
# Cloud Run optimized logging configuration
if ENV in ['staging', 'production']:
    # For Cloud Run: Use structured logging to stdout/stderr
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {
            "console": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "cloud_run",
            },
            "error_console": {
                "level": "ERROR",
                "class": "logging.StreamHandler",
                "formatter": "cloud_run",
                "stream": "ext://sys.stderr",
            },
        },
        "formatters": {
            "cloud_run": {
                "format": '{"timestamp": "%(asctime)s", "severity": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "module": "%(module)s", "funcName": "%(funcName)s", "lineno": %(lineno)d}',
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console", "error_console"],
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "skill_assessment": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "websockets": {
                "handlers": ["console"],
                "level": "WARNING",
                "propagate": False,
            },
            "chats": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "auth_middleware": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "ai": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "tasks": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "celery": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "celery.task": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "paystack": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "paystack_subscriptions": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "flutterwave": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "scheduler": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "emails": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "elevenlabs": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "sourcing": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "marketing": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "management": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "payments": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "subscriptions": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "create_user": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "talentsync_backend": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "contract": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "jobs": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }
else:
    # For development: Use file-based logging
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {
            "console": {
                "level": "DEBUG",
                "class": "logging.StreamHandler",
                "formatter": "verbose",
            },
            "ai": {
                "level": "DEBUG",
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/ai.log",
                "maxBytes": 30 * 1024 * 1024,
                "backupCount": 8,
                "formatter": "verbose",
            },
            "flutterwave": {
                "level": "DEBUG",
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/flutterwave.log",
                "maxBytes": 30 * 1024 * 1024,
                "backupCount": 8,
                "formatter": "verbose",
            },
            "elevenlabs": {
                "level": "DEBUG",
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/elevenlabs.log",
                "maxBytes": 30 * 1024 * 1024,
                "backupCount": 8,
                "formatter": "verbose",
            },
            "paystack": {
                "level": "DEBUG",
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/paystack.log",
                "maxBytes": 30 * 1024 * 1024,
                "backupCount": 8,
                "formatter": "verbose",
            },
            "tasks": {
                "level": "DEBUG",
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/tasks.log",
                "maxBytes": 30 * 1024 * 1024,
                "backupCount": 8,
                "formatter": "verbose",
            },
        },
        "formatters": {
            "verbose": {
                "format": "[{levelname}] {asctime} {module} {message}",
                "style": "{",
            },
        },
        "loggers": {
            "skill_assessment": {
                "handlers": ["console", "elevenlabs"],
                "level": "DEBUG",
                "propagate": False,
            },
            "websockets": {
                "handlers": ["console"],
                "level": "WARNING",
                "propagate": False,
            },
            "chats": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
            },
            "auth_middleware": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
            },
            "ai": {
                "handlers": ["ai"],
                "level": "DEBUG",
                "propagate": False,
            },
            "tasks": {
                "handlers": ["tasks"],
                "level": "DEBUG",
                "propagate": False,
            },
            "paystack": {
                "handlers": ["paystack"],
                "level": "DEBUG",
                "propagate": False,
            },
            "flutterwave": {
                "handlers": ["flutterwave"],
                "level": "DEBUG",
                "propagate": False,
            },
            "scheduler": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
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

OTP_EXPIRY_TIME = 600  # seconds; OTPs grant login tokens, keep the window short
MAX_CONCONCURRENT_INTERVIEWS= env("MAX_CONCURRENT_INTERVIEWS", cast=int, default=5)


# Swagger Settings
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
        }
    },
}
# Job emails for resume screening results
REJECTION_MAIL_DELAY_SECONDS = env.int(
    "REJECTION_MAIL_DELAY_SECONDS",
    default=1800 
)

ACCEPTANCE_MAIL_DELAY_SECONDS = env.int(
    "ACCEPTANCE_MAIL_DELAY_SECONDS",
    default=60  
)

BASE_URL=env("BASE_URL", default="http://localhost:8000")



#ConvertKit Settings
CONVERTKIT_API_KEY = env("CONVERTKIT_API_KEY", default="")
CONVERTKIT_API_SECRET = env("CONVERTKIT_API_SECRET", default="")

# ConvertKit Form IDs
CONVERTKIT_RECRUITER_FORM = env("CONVERTKIT_RECRUITER_FORM", default="")
CONVERTKIT_CANDIDATE_FORM = env("CONVERTKIT_CANDIDATE_FORM", default="")

# ConvertKit Tag IDs
CONVERTKIT_INCOMPLETE_ASSESSMENT_TAG = env("CONVERTKIT_INCOMPLETE_ASSESSMENT_TAG", default="")
CONVERTKIT_INCOMPLETE_PROFILE_TAG = env("CONVERTKIT_INCOMPLETE_PROFILE_TAG", default="")
CONVERTKIT_RESUME_SCREENING_PASSED_TAG = env("CONVERTKIT_RESUME_SCREENING_PASSED_TAG", default="")