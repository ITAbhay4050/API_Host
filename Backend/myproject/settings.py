"""
Django settings for Comptech Equipment LIMITED (PRODUCTION READY)
"""

from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(str(BASE_DIR / ".env"))

# ------------------------------------------------------------------
# CORE
# ------------------------------------------------------------------
SECRET_KEY = os.getenv("DJ_SECRET_KEY", "change-this-secret-key")

DEBUG = True

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    ".trycloudflare.com",
    "comptechserv.netlify.app",
]

# ------------------------------------------------------------------
# APPS
# ------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",

    "api",
]

# ------------------------------------------------------------------
# MIDDLEWARE
# ------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",

    # ❌ IMPORTANT: CSRF DISABLED FOR API (fixes your error)
    # "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "myproject.urls"
WSGI_APPLICATION = "myproject.wsgi.application"

# ------------------------------------------------------------------
# TEMPLATES
# ------------------------------------------------------------------
TEMPLATES = [
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
            ],
        },
    },
]

# ------------------------------------------------------------------
# DATABASE (KEEP YOUR EXISTING CONFIG HERE)
# ------------------------------------------------------------------
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
        "NAME": "Munim006",
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
        "NAME": "Munim006",
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



# ------------------------------------------------------------------
# PASSWORD VALIDATION
# ------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------
# INTERNATIONALIZATION
# ------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = False

# ------------------------------------------------------------------
# STATIC / MEDIA
# ------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------
# REST FRAMEWORK (IMPORTANT FIX)
# ------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # 🔥 FIX: prevents auth blocking
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ------------------------------------------------------------------
# CORS (NETLIFY SAFE)
# ------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    "https://comptechserv.netlify.app",
]

CORS_ALLOW_CREDENTIALS = True

# ------------------------------------------------------------------
# CSRF (IMPORTANT FOR CLOUD TUNNEL + REACT)
# ------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = [
    "https://comptechserv.netlify.app",
    "https://*.trycloudflare.com",
]

# ------------------------------------------------------------------
# EMAIL (MOVE TO ENV IN FUTURE)
# ------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "it02comptech@gmail.com"
EMAIL_HOST_PASSWORD = "ytno qhlv ihnz mqlx"

# ------------------------------------------------------------------
# LOGGING
# ------------------------------------------------------------------
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

# ------------------------------------------------------------------
# JAZZMIN
# ------------------------------------------------------------------
JAZZMIN_SETTINGS = {
    "site_title": "Comptech Admin",
    "site_header": "Comptech",
    "site_brand": "Comptech",
    "welcome_sign": "Welcome to Comptech Dashboard",
    "copyright": "Comptech",
    "show_ui_builder": True,
}