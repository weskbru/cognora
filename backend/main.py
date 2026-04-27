import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.config.settings import settings
from api.routes import auth, entities, upload, nlp, limits


def _run_migrations():
    """Idempotent column additions for new auth fields."""
    from infrastructure.database.connection import engine
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE",
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
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _run_migrations()
    except Exception:
        pass
    yield


app = FastAPI(title="Cognora API", lifespan=lifespan)

_wildcard_origins = settings.allowed_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    # allow_credentials=True é incompatível com allow_origins=["*"] (spec CORS).
    # Este projeto usa JWT via header Authorization (não cookies),
    # então credentials só é necessário em produção com origem específica.
    allow_credentials=not _wildcard_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({k: v for k, v in error.items() if k != "input"})
    return JSONResponse(status_code=422, content={"detail": errors})


app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(nlp.router)
app.include_router(limits.router)
app.include_router(entities.router)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
