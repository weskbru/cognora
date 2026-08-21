import os
import logging
import uuid
from time import perf_counter
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.config.settings import settings
from api.routes import admin, auth, entities, upload, nlp, limits, observability, subscriptions
from infrastructure.database.connection import SessionLocal, engine
from infrastructure.observability import (
    cleanup_old_system_events,
    record_system_event,
    reset_current_request_id,
    set_current_request_id,
)

logger = logging.getLogger(__name__)
MAX_JSON_REQUEST_BYTES = 2 * 1024 * 1024
MAX_UPLOAD_REQUEST_BYTES = 55 * 1024 * 1024


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
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS summaries_used_month INTEGER DEFAULT 0",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS questions_used_month INTEGER DEFAULT 0",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS flashcards_used_month INTEGER DEFAULT 0",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS usage_month DATE",
        # Stripe subscription columns
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR UNIQUE",
        "ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR",
        "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_email VARCHAR",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS owner_email VARCHAR",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS owner_email VARCHAR",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS questions_data JSONB DEFAULT '[]'",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS question_ids JSONB DEFAULT '[]'",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS winner_email VARCHAR",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS week_start DATE",
        "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS week_end DATE",
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
        """CREATE TABLE IF NOT EXISTS observability_alert_states (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            alert_key VARCHAR NOT NULL UNIQUE,
            last_sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS study_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'IN_PROGRESS',
            subjects JSONB DEFAULT '[]',
            questions_planned JSONB DEFAULT '[]',
            questions_answered JSONB DEFAULT '[]',
            reviews_planned JSONB DEFAULT '[]',
            reviews_completed JSONB DEFAULT '[]',
            xp_awarded INTEGER DEFAULT 0,
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            abandoned_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS subject_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR NOT NULL,
            subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            last_studied_at TIMESTAMP,
            next_review_at TIMESTAMP,
            review_stage INTEGER DEFAULT 1,
            completed_reviews_count INTEGER DEFAULT 0,
            accuracy_rate INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
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
        "CREATE INDEX IF NOT EXISTS ix_observability_alert_states_alert_key ON observability_alert_states (alert_key)",
        "CREATE INDEX IF NOT EXISTS ix_study_sessions_user_email ON study_sessions (user_email)",
        "CREATE INDEX IF NOT EXISTS ix_study_sessions_status ON study_sessions (status)",
        "CREATE INDEX IF NOT EXISTS ix_study_sessions_started_at ON study_sessions (started_at)",
        "CREATE INDEX IF NOT EXISTS ix_subject_progress_user_email ON subject_progress (user_email)",
        "CREATE INDEX IF NOT EXISTS ix_subject_progress_subject_id ON subject_progress (subject_id)",
        "CREATE INDEX IF NOT EXISTS ix_subject_progress_next_review_at ON subject_progress (next_review_at)",
        "CREATE INDEX IF NOT EXISTS ix_subjects_owner_email ON subjects (owner_email)",
        "CREATE INDEX IF NOT EXISTS ix_documents_subject_id ON documents (subject_id)",
        "CREATE INDEX IF NOT EXISTS ix_questions_subject_id ON questions (subject_id)",
        "CREATE INDEX IF NOT EXISTS ix_questions_document_id ON questions (document_id)",
        "CREATE INDEX IF NOT EXISTS ix_questions_owner_email ON questions (owner_email)",
        "CREATE INDEX IF NOT EXISTS ix_summaries_document_id ON summaries (document_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_subject_id ON flashcards (subject_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_document_id ON flashcards (document_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_owner_email ON flashcards (owner_email)",
        "CREATE INDEX IF NOT EXISTS ix_competitions_host_email ON competitions (host_email)",
        "CREATE INDEX IF NOT EXISTS ix_competitions_subject_id ON competitions (subject_id)",
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
        if engine.dialect.name != "sqlite":
            db = SessionLocal()
            try:
                cleanup_old_system_events(db)
            finally:
                db.close()
    except Exception:
        logger.exception("Falha ao executar migrações de startup")
    yield


api = FastAPI(title="Cognora API", lifespan=lifespan)
api.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)


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
    started_at = perf_counter()
    token = set_current_request_id(request_id)
    try:
        content_length = request.headers.get("content-length")
        request_limit = MAX_UPLOAD_REQUEST_BYTES if request.url.path == "/api/upload" else MAX_JSON_REQUEST_BYTES
        if content_length and int(content_length) > request_limit:
            response = JSONResponse(
                status_code=413,
                content={"detail": {"code": "REQUEST_TOO_LARGE", "message": "Requisição muito grande."}},
            )
        else:
            response = await call_next(request)
    except ValueError:
        response = JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
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
    duration_ms = (perf_counter() - started_at) * 1000
    response.headers["Server-Timing"] = f"app;dur={duration_ms:.2f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if duration_ms >= settings.slow_request_ms:
        logger.warning(
            "Requisição lenta: method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
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
