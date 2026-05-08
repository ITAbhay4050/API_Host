"""Django settings for myproject (Comptech Equipment LIMITED).
Updated 2 July 2025: fixed DRF permission class, moved secrets to env vars,
added MySQL strict-mode, clarified typing.

⚠️  Do **NOT** commit this file with real credentials – use .env instead.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Base path & .env loader
# -----------------------------------------------------------------------------
BASE_DIR: Path = Path(__file__).resolve().parent.parent
load_dotenv(str(BASE_DIR / ".env"))  # accepts str on Windows

# -----------------------------------------------------------------------------
# Core settings
# -----------------------------------------------------------------------------
SECRET_KEY: str = os.getenv("DJ_SECRET_KEY", "django-insecure-please_change_me")
DEBUG: bool = os.getenv("DJ_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS: list[str] = [host.strip() for host in os.getenv("DJ_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")]

# -----------------------------------------------------------------------------
# Applications
# -----------------------------------------------------------------------------
INSTALLED_APPS: list[str] = [
    #"jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # 3rd-party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",

    # local
    "api",  # your app
]

# -----------------------------------------------------------------------------
# Middleware
# -----------------------------------------------------------------------------
MIDDLEWARE: list[str] = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # keep above CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF: str = "myproject.urls"
WSGI_APPLICATION: str = "myproject.wsgi.application"

# -----------------------------------------------------------------------------
# Templates
# -----------------------------------------------------------------------------
TEMPLATES: list[dict] = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# -----------------------------------------------------------------------------
# Database: Default 'Application' DB and 'munim006' DB
# -----------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "mssql",
        "NAME": os.getenv("DJ_DB_NAME", "App_pro"),
        "USER": os.getenv("DJ_DB_USER", "sa"),
        "PASSWORD": os.getenv("DJ_DB_PASSWORD", "nipl@12345"),
        "HOST": os.getenv("DJ_DB_HOST", "192.168.1.4"),
        "PORT": os.getenv("DJ_DB_PORT", "1433"),
        "OPTIONS": {
            "driver": "ODBC Driver 17 for SQL Server",
        },
    },
    "munim006_db": {
        "ENGINE": "mssql",
        "NAME": "Munim008",
        "USER": "sa",
        "PASSWORD": "nipl@12345",
        "HOST": "192.168.1.4",
        "PORT": "1433",
        "OPTIONS": {
            "driver": "ODBC Driver 17 for SQL Server",
        },
    },
     "munim008_db": {
        "ENGINE": "mssql",
        "NAME": "Munim008",
        "USER": "sa",
        "PASSWORD": "nipl@12345",
        "HOST": "192.168.1.4",
        "PORT": "1433",
        "OPTIONS": {
            "driver": "ODBC Driver 17 for SQL Server",
        },
    },
     "munim010_db": {
        "ENGINE": "mssql",
        "NAME": "Munim010",
        "USER": "sa",
        "PASSWORD": "nipl@12345",
        "HOST": "192.168.1.4",
        "PORT": "1433",
        "OPTIONS": {
            "driver": "ODBC Driver 17 for SQL Server",
        },
    },
   
}
DATABASE_ROUTERS = [
    'api.db_routers.Munim006Router',
    'api.db_routers.Munim008Router',   # 👈 add this
]

# -----------------------------------------------------------------------------
# Password validation
# -----------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# -----------------------------------------------------------------------------
# Internationalisation
# -----------------------------------------------------------------------------
# -------------------------------------------------------------------
# Internationalisation
# -------------------------------------------------------------------
LANGUAGE_CODE = "en-us"

# India Timezone
TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

# 🔥 IMPORTANT FIX (for SQL Server IST setup)
USE_TZ = False

# -----------------------------------------------------------------------------
# Static & media
# -----------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------------------------------------------------------------
# Django REST Framework defaults
# -----------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# -----------------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS: bool = os.getenv("DJ_CORS_ALLOW_ALL", "True").lower() == "true"
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv("DJ_CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()
    ]

# -----------------------------------------------------------------------------
# Email (SMTP)
# -----------------------------------------------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'it02comptech@gmail.com'
EMAIL_HOST_PASSWORD = 'ytno qhlv ihnz mqlx'

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
JAZZMIN_SETTINGS = {
    "site_title": "Comptech Admin",
    "site_header": "Comptech",
    "site_brand": "Comptech",

    "welcome_sign": "Welcome to Comptech Dashboard",
    "copyright": "Comptech",
    "show_ui_builder": True,
    "user_avatar": None,
}
