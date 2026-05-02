import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

try:
    load_dotenv(encoding="utf-8-sig")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-development-secret-key")

DEBUG = os.getenv("DEBUG", "1") == "1"

ALLOWED_HOSTS: list[str] = os.getenv("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "corsheaders",
    "core",
    "auth",
    "reports",
    "complaints",
    "csvapp",
    "transcription",
    "audios",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = "urls"

TEMPLATES: list[dict] = []

WSGI_APPLICATION = "wsgi.application"

# We are not using Django ORM; connect to MongoDB directly via pymongo.
DATABASES: dict = {
    "default": {
        "ENGINE": "django.db.backends.dummy",
    }
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_ROOT = BASE_DIR.parent / "media"
MEDIA_URL = "/media/"

# JWT configuration shared by Django service
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-jwt-secret-in-prod")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_LIFETIME = timedelta(
    minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MIN", "60"))
)
JWT_REFRESH_TOKEN_LIFETIME = timedelta(
    days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))
)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "radiology_platform")

# Email (configure via .env)
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1") == "1"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")

