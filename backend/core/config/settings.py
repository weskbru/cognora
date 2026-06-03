import os

# Raiz do backend (/app em Docker, backend/ localmente)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _clean_env(name: str) -> str | None:
    """Remove artefatos comuns ao colar variáveis em painéis de deploy."""
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip().strip("\"'")
    prefix = f"{name}="
    if value.upper().startswith(prefix):
        value = value[len(prefix):].strip().strip("\"'")
    return value or None


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://cognora:cognora@db:5432/cognora"
    )
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-troque-em-producao")
    algorithm: str = "HS256"
    token_expire_days: int = 1   # 1 dia — renovado a cada login
    upload_dir: str = _clean_env("UPLOAD_DIR") or os.path.join(_BACKEND_DIR, "uploads")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    nvidia_api_key: str | None = os.getenv("NVIDIA_API_KEY")
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    resend_api_key: str | None = os.getenv("RESEND_API_KEY")
    google_client_id: str | None = os.getenv("GOOGLE_CLIENT_ID")
    app_url: str = os.getenv("APP_URL", "http://localhost:5173")
    stripe_secret_key: str | None = os.getenv("STRIPE_SECRET_KEY")
    stripe_webhook_secret: str | None = os.getenv("STRIPE_WEBHOOK_SECRET")
    stripe_price_id_pro: str | None = os.getenv("STRIPE_PRICE_ID_PRO")
    stripe_price_id_unlimited: str | None = os.getenv("STRIPE_PRICE_ID_UNLIMITED")
    pix_key: str | None = _clean_env("PIX_KEY")
    pix_merchant_name: str = os.getenv("PIX_MERCHANT_NAME", "COGNORA")[:25]
    pix_merchant_city: str = os.getenv("PIX_MERCHANT_CITY", "SAO PAULO")[:15]
    pix_plan_price_cents_pro: int = int(os.getenv("PIX_PRICE_CENTS_PRO", "990"))
    pix_plan_price_cents_unlimited: int = int(os.getenv("PIX_PRICE_CENTS_UNLIMITED", "1990"))
    admin_emails: list[str] = [
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    ]
    observability_retention_days: int = int(os.getenv("OBSERVABILITY_RETENTION_DAYS", "30"))
    observability_alert_emails: list[str] = [
        email.strip().lower()
        for email in os.getenv("OBSERVABILITY_ALERT_EMAILS", os.getenv("ADMIN_EMAILS", "")).split(",")
        if email.strip()
    ]
    observability_alert_error_threshold: int = int(os.getenv("OBSERVABILITY_ALERT_ERROR_THRESHOLD", "5"))
    observability_alert_window_minutes: int = int(os.getenv("OBSERVABILITY_ALERT_WINDOW_MINUTES", "10"))
    observability_alert_cooldown_minutes: int = int(os.getenv("OBSERVABILITY_ALERT_COOLDOWN_MINUTES", "60"))
    # ALLOWED_ORIGINS: lista separada por vírgula, ex: "https://app.com,https://www.app.com"
    # Em desenvolvimento, deixe vazio ou use "*" (qualquer origem)
    allowed_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,https://cognora-pi.vercel.app",
        ).split(",")
        if o.strip()
    ]


settings = Settings()
