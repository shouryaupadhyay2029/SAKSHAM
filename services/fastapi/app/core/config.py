from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "SAKSHAM FastAPI Service"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api/v1"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DATABASE_URL: str = "postgresql://saksham:saksham_secure_pass_2026@localhost:5432/saksham_db"
    OSRM_BASE_URL: str = "http://router.project-osrm.org"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Validate production routing backend constraint
if settings.ENVIRONMENT.lower() == "production" and (not settings.OSRM_BASE_URL or "router.project-osrm.org" in settings.OSRM_BASE_URL):
    import warnings
    warnings.warn("Production environment detected. A private/explicit OSRM instance is highly recommended instead of the public demo server.")

