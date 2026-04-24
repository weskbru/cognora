import os

# Raiz do backend (/app em Docker, backend/ localmente)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://cognora:cognora@db:5432/cognora"
    )
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-troque-em-producao")
    algorithm: str = "HS256"
    token_expire_days: int = 30
    upload_dir: str = os.path.join(_BACKEND_DIR, "uploads")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    nvidia_api_key: str | None = os.getenv("NVIDIA_API_KEY")
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_key: str | None = os.getenv("SUPABASE_KEY")
    # ALLOWED_ORIGINS: lista separada por vírgula, ex: "https://app.com,https://www.app.com"
    # Em desenvolvimento, deixe vazio ou use "*" (qualquer origem)
    allowed_origins: list[str] = [
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if o.strip()
    ]


settings = Settings()