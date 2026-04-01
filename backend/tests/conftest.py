"""
Configuração global de testes.

Por padrão usa SQLite em memória (sem dependências externas).
Para testes de integração completos com PostgreSQL, defina:
    TEST_DATABASE_URL=postgresql://usuario:senha@localhost/cognora_test
"""
import os
import uuid as _uuid_lib

# ── Configura variáveis de ambiente ANTES de importar qualquer módulo ──────
# As classes Settings e GeminiNLPAdapter lêem os.getenv() em tempo de import.
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
os.environ["DATABASE_URL"] = _TEST_DB_URL
# Chave placeholder: permite GeminiNLPAdapter ser instanciado sem erro;
# chamadas reais à API são sempre mockadas nos testes de NLP.
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-placeholder")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Importa o app depois de configurar o ambiente ──────────────────────────
from main import app
from infrastructure.database.connection import Base, get_db
from infrastructure.database.models import User
from core.security.password import hash_password
from core.security.jwt import create_token

# ── Banco de dados de teste ────────────────────────────────────────────────
_is_sqlite = _TEST_DB_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        _TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # ── Patch: postgresql.UUID no SQLite não converte strings com traços.
    # Este patch faz o bind_processor aceitar tanto uuid.UUID quanto str.
    from sqlalchemy.dialects.postgresql import UUID as _PG_UUID

    _original_bind = _PG_UUID.bind_processor

    def _patched_bind(self, dialect):
        original = _original_bind(self, dialect)
        if original is None:
            return None

        def _process(value):
            if value is None:
                return None
            if isinstance(value, str):
                try:
                    return _uuid_lib.UUID(value).hex
                except (ValueError, AttributeError):
                    return value
            return original(value)

        return _process

    _PG_UUID.bind_processor = _patched_bind

else:
    engine = create_engine(_TEST_DB_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Cria todas as tabelas uma única vez ao carregar o módulo
Base.metadata.create_all(bind=engine)


# ── Override do get_db para redirecionar ao banco de teste ─────────────────
def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture()
def db():
    """Sessão de banco de dados para testes unitários."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    """TestClient FastAPI com banco de teste configurado."""
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def test_user(db):
    """Usuário de teste com email único e senha conhecida."""
    email = f"user_{_uuid_lib.uuid4().hex[:8]}@cognora.com"
    user = User(email=email, hashed_password=hash_password("senha123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def auth_headers(test_user):
    """Cabeçalhos HTTP com Bearer token válido para test_user."""
    token = create_token(test_user.email)
    return {"Authorization": f"Bearer {token}"}
