from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from core.config.settings import settings


engine_options = {"pool_pre_ping": True, "pool_recycle": 1800}
if not settings.database_url.startswith("sqlite"):
    engine_options.update({"pool_size": 10, "max_overflow": 20, "pool_timeout": 10})

engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
