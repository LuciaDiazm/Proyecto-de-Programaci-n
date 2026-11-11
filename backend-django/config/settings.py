"""
Configuración del proyecto Al Día (API de suscripciones).

Las variables sensibles se leen de un archivo .env con python-dotenv (Clase 1).
Los comentarios "Clase N" indican en qué clase de la materia se vio cada bloque.
"""

from datetime import timedelta
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")  # Carga las variables de entorno del archivo .env


def lista_desde_env(nombre, por_defecto=""):
    """Convierte 'a,b,c' del .env en ['a', 'b', 'c']."""
    valor = os.getenv(nombre, por_defecto)
    return [item.strip() for item in valor.split(",") if item.strip()]


SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"

# Clase 8: con DEBUG=False Django rechaza cualquier dominio que no esté en esta lista
ALLOWED_HOSTS = lista_desde_env("ALLOWED_HOSTS", "127.0.0.1,localhost")


# Aplicaciones

INSTALLED_APPS = [
    "daphne",  # Clase 9: tiene que ir primera para reemplazar el runserver por uno ASGI
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",  # Clase 7: la necesita allauth
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # Clase 6: lista negra de refresh tokens
    "django_filters",  # Clase 5
    "corsheaders",  # Clase 8
    "channels",  # Clase 9
    "graphene_django",  # Clase 11
    "allauth",  # Clase 7: login social
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "suscripciones",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Clase 8: tiene que ir primera
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Clase 12: estáticos en producción
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",  # Clase 7: obligatorio para allauth
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"  # Clase 9


# Base de datos (Clase 12): SQLite por defecto; PostgreSQL o MySQL se eligen por .env

DB_ENGINE = os.getenv("DB_ENGINE", "sqlite")

if DB_ENGINE == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            # DB_ENGINE=postgresql  o  DB_ENGINE=mysql
            "ENGINE": f"django.db.backends.{DB_ENGINE}",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT"),
        }
    }
    if DB_ENGINE == "mysql":
        DATABASES["default"]["OPTIONS"] = {"charset": "utf8mb4"}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Idioma y zona horaria de Argentina

LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # Clase 12: acá junta collectstatic
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework

REST_FRAMEWORK = {
    # Clase 6: acepta el JWT que emite la API de Node y el que emite simplejwt (/api/token/)
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "suscripciones.autenticacion.JWTNodeAuthentication",
        "suscripciones.autenticacion.JWTDjangoAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "suscripciones.exceptions.custom_exception_handler",
    "COERCE_DECIMAL_TO_STRING": False,  # Los montos viajan como número en el JSON
    # Clase 5: paginación, filtros, búsqueda y orden
    "DEFAULT_PAGINATION_CLASS": "suscripciones.pagination.PaginacionEstandar",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    # Clase 8: límite de peticiones
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "100/minute",
        "login": "5/minute",
    },
}


# Clase 6: access corto + refresh largo, con rotación y lista negra

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}


# Clase 7: login social con Google (si no hay credenciales, el resto de la API funciona igual)

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        },
        "SCOPE": ["profile", "email"],
    }
}

LOGIN_REDIRECT_URL = "/api/auth/social/jwt/"


# Integración con la API de Node

JWT_SECRET = os.getenv("JWT_SECRET")          # Misma clave que usa Node para firmar
JWT_ISSUER = os.getenv("JWT_ISSUER", "aldia-auth")
API_KEY_INTERNA = os.getenv("API_KEY_INTERNA")  # Clave para la comunicación servidor a servidor
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3000")


# Clase 8: CORS solo para orígenes conocidos, nunca CORS_ALLOW_ALL_ORIGINS

CORS_ALLOWED_ORIGINS = lista_desde_env("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

# Clase 12: necesario detrás de HTTPS para el /admin/
CSRF_TRUSTED_ORIGINS = lista_desde_env("CSRF_TRUSTED_ORIGINS")


# Clase 10: Redis conecta los procesos; sin REDIS_URL (desarrollo) se usa la memoria del proceso

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        },
    }
else:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


# Clase 11: GraphQL

GRAPHENE = {
    "SCHEMA": "config.schema.schema",
}


# Clase 12: opciones que solo tienen sentido con HTTPS (las revisa "manage.py check --deploy")

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = os.getenv("COOKIES_SEGURAS", "True") == "True"
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))


# Clases 2 y 8: logs técnicos en consola, auditoría e importaciones en archivos propios

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
        "security_file": {"class": "logging.FileHandler", "filename": BASE_DIR / "security.log", "delay": True},
        "import_file": {"class": "logging.FileHandler", "filename": BASE_DIR / "import.log", "delay": True},
    },
    "loggers": {
        "suscripciones": {"handlers": ["console"], "level": "INFO"},
        "security": {"handlers": ["security_file"], "level": "WARNING"},
        "importacion": {"handlers": ["import_file"], "level": "WARNING"},
    },
}
