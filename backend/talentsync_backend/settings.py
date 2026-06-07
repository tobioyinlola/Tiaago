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
    "django_bunny"
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
    "marketing.middleware.MarketingMiddleware",
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ROOT_URLCONF = "talentsync_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", BASE_DIR / "emails" / "email_templates" / "talents" , BASE_DIR / "emails" / "email_templates" / "startups"],
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

# Toggle Bunny via env (USE_BUNNY=1 to enable)
USE_BUNNY = env.bool("USE_BUNNY", default=False)

if USE_BUNNY:
    BUNNY_USERNAME=env("BUNNY_USERNAME")  
    BUNNY_PASSWORD = env("BUNNY_PASSWORD")
    BUNNY_STORAGE_NAME=env("BUNNY_USERNAME")  
    BUNNY_STORAGE_PASSWORD=env("BUNNY_PASSWORD")
    BUNNY_REGION   = env("BUNNY_REGION", default="jh")
    BUNNY_MEDIA_URL = env("BUNNY_MEDIA_URL")

    # Ensure trailing slash for proper .url() joining
    if not BUNNY_MEDIA_URL.endswith("/"):
        BUNNY_MEDIA_URL += "/"

    # Default storage: Bunny
    STORAGES["default"] = {
        "BACKEND": "django_bunny.storage.BunnyStorage",
    }

    # Make Django/DRF emit CDN URLs for file fields
    MEDIA_URL = BUNNY_MEDIA_URL

    # MEDIA_ROOT is unused with Bunny but keep a safe default (some code may read it)
    MEDIA_ROOT = BASE_DIR / "media"

else:
    # Local filesystem (dev / fallback)
    STORAGES["default"] = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    }
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"




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
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
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
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
}

REST_AUTH = {
    "USER_DETAILS_SERIALIZER": "create_user.api.serializers.CustomUserSerializer",
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "my-app-auth",
    "JWT_AUTH_REFRESH_COOKIE": "my-refresh-token",
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
DEFAULT_FROM_EMAIL = "Tiaago Dev <no-reply@tiaago.com>"


SITE_ID = 1

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

PHONENUMBER_DEFAULT_REGION = "NG"

# FOR THE TEMPLATE
TIAAGO_TALENT_LOGIN_URL = "https://www.tiaago.com/talents/signin"
TIAAGO_STARTUP_LOGIN_URL = "https://www.tiaago.com/startups/signin"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.tiaago.com/")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "https://www.tiaago.com")
TIAAGO_MAIL_SUPPORT = "mailto:support@Tiaago.com"

IS_PRODUCTION = ENV == "production"
IS_STAGING = ENV == "staging"
IS_DEV = ENV == "development"

logger.info(f"Environment:working on {ENV}")
logger.info(f"Environment:working on {FRONTEND_URL}")

# Prices for wallet deduction
PAYG_PRICES = {
    "resume_screening": {
        "ngn": Decimal("50.00"),
        "usd": Decimal("0.030"),
    },
    "assessment": {
        "ngn": Decimal("150.00"),
        "usd": Decimal("0.090"),
    }
}


if IS_PRODUCTION:
    from .prod_settings import *
    CORS_ALLOWED_ORIGINS = ["http://localhost:3040", "https://www.tiaago.com", "https://.tiaago.com"]
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ]
elif IS_STAGING:
    from .staging_settings import *
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ]
else:
    CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "https://tiaago-v2-frontend.fly.dev"]
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
        "rest_framework.authentication.TokenAuthentication",
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
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

FRONTEND_SUCCESS_URL = env("FRONTEND_SUCCESS_URL", default="https://www.tiaago.com/payment/success")
FRONTEND_CANCEL_URL = env("FRONTEND_CANCEL_URL", default="https://www.tiaago.com/payment/cancel")
FRONTEND_CALLBACK_URL = env("FRONTEND_CALLBACK_URL", default="https://www.tiaago.com/payment/callback")
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
            "paystack": {
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

OTP_EXPIRY_TIME = 3000
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

BASE_URL=env("BASE_URL")



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