import os
import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.config.settings import settings
from api.routes import admin, auth, entities, upload, nlp, limits, observability, subscriptions
from infrastructure.database.connection import SessionLocal
from infrastructure.observability import (
    record_system_event,
    reset_current_request_id,
    set_current_request_id,
)

logger = logging.getLogger(__name__)


def _run_migrations():
    """Idempotent column additions for new auth fields."""
    from infrastructure.database.connection import engine
    from sqlalchemy import text
    if engine.dialect.name == "sqlite":
        return
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user' NOT NULL",
        "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL",
        """CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR NOT NULL,
            token VARCHAR NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE
        )""",
        "CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)",
        "CREATE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)",
        "CREATE INDEX IF NOT EXISTS ix_prt_user_email ON password_reset_tokens (user_email)",
        "CREATE INDEX IF NOT EXISTS ix_prt_token ON password_reset_tokens (token)",
        # Profile and freemium columns
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS display_name VARCHAR",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_url VARCHAR",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan VARCHAR DEFAULT 'free'",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'inactive'",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS daily_generations_used INTEGER DEFAULT 0",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_generation_date DATE",
        # Stripe subscription columns
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR UNIQUE",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR",
        "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_email VARCHAR",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS questions_data JSONB DEFAULT '[]'",
        """CREATE TABLE IF NOT EXISTS pix_payment_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_email VARCHAR NOT NULL,
            user_name VARCHAR,
            plan VARCHAR NOT NULL,
            amount_cents INTEGER NOT NULL,
            pix_reference VARCHAR NOT NULL UNIQUE,
            pix_payload TEXT NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'pending',
            expires_at TIMESTAMP NOT NULL,
            paid_at TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
            rejected_at TIMESTAMP,
            admin_note TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            admin_email VARCHAR NOT NULL,
            action VARCHAR NOT NULL,
            target_user_email VARCHAR,
            target_type VARCHAR NOT NULL,
            target_id VARCHAR NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS system_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            level VARCHAR NOT NULL,
            event_type VARCHAR NOT NULL,
            user_email VARCHAR,
            request_id VARCHAR,
            message TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_user_id ON pix_payment_requests (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_user_email ON pix_payment_requests (user_email)",
        "CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_status ON pix_payment_requests (status)",
        "CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_reference ON pix_payment_requests (pix_reference)",
        "CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_admin_email ON admin_audit_logs (admin_email)",
        "CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_action ON admin_audit_logs (action)",
        "CREATE INDEX IF NOT EXISTS ix_system_events_level ON system_events (level)",
        "CREATE INDEX IF NOT EXISTS ix_system_events_event_type ON system_events (event_type)",
        "CREATE INDEX IF NOT EXISTS ix_system_events_user_email ON system_events (user_email)",
        "CREATE INDEX IF NOT EXISTS ix_system_events_request_id ON system_events (request_id)",
        "CREATE INDEX IF NOT EXISTS ix_system_events_created_at ON system_events (created_at)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                logger.exception("Falha ao executar migração idempotente: %s", sql)
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _run_migrations()
    except Exception:
        logger.exception("Falha ao executar migrações de startup")
    yield


api = FastAPI(title="Cognora API", lifespan=lifespan)


def _request_id_from_headers(request: Request) -> str:
    incoming = request.headers.get("x-request-id")
    if incoming:
        request_id = incoming.strip()
        if 8 <= len(request_id) <= 80:
            return request_id
    return str(uuid.uuid4())


@api.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = _request_id_from_headers(request)
    token = set_current_request_id(request_id)
    try:
        response = await call_next(request)
    except Exception as exc:
        db = SessionLocal()
        try:
            record_system_event(
                db,
                level="error",
                event_type="http_unhandled_exception",
                request_id=request_id,
                message="Erro inesperado nao tratado.",
                metadata={
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(exc),
                },
            )
        finally:
            db.close()
        raise
    finally:
        reset_current_request_id(token)
    response.headers["X-Request-ID"] = request_id
    return response


@api.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({k: v for k, v in error.items() if k != "input"})
    db = SessionLocal()
    try:
        record_system_event(
            db,
            level="warning",
            event_type="http_validation_error",
            message="Requisicao rejeitada por validacao.",
            metadata={
                "method": request.method,
                "path": request.url.path,
                "errors": errors,
            },
        )
    finally:
        db.close()
    return JSONResponse(status_code=422, content={"detail": errors})


api.include_router(auth.router)
api.include_router(admin.router)
api.include_router(upload.router)
api.include_router(nlp.router)
api.include_router(limits.router)
api.include_router(observability.router)
api.include_router(subscriptions.router)
api.include_router(entities.router)

os.makedirs(settings.upload_dir, exist_ok=True)
api.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

_wildcard_origins = settings.allowed_origins == ["*"]
app = CORSMiddleware(
    app=api,
    allow_origins=settings.allowed_origins,
    # O wrapper global mantém headers CORS até em respostas 500 inesperadas.
    # JWT é enviado via Authorization, sem cookies.
    allow_credentials=not _wildcard_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mantém compatibilidade com testes e overrides de dependência do FastAPI.
app.dependency_overrides = api.dependency_overrides
