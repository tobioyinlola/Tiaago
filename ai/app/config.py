from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"
    TEMP_FILE_DIR: str = "temp"

    # File upload configuration
    MAX_FILE_SIZE: int = 20 * 1024 * 1024  # 20MB in bytes

    # Resume screening configuration
    RESUME_SCREENING_STRICT_MODE: bool = True
    RESUME_SCREENING_MIN_SCORE_STRONGLY_RECOMMEND: int = 85
    RESUME_SCREENING_MIN_SCORE_RECOMMEND: int = 70
    RESUME_SCREENING_MIN_SCORE_CONSIDER: int = 60

    # Deployment environment. render.yaml sets ENV=production for tiaago-ai.
    ENV: str = "development"

    # Inter-service auth: shared secret the backend sends as X-Service-Key.
    # Empty disables auth in development only; in production requests are
    # rejected until the key is configured (fail closed).
    AI_SERVICE_API_KEY: str = ""

    # Comma-separated list of allowed CORS origins. Defaults to localhost dev only.
    # Example: "https://backend.tiaago.com,https://staging-backend.tiaago.com"
    CORS_ORIGINS: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_file_encoding='utf-8'
    )

settings = Settings()