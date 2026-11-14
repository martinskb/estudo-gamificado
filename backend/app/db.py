from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def _normalize_url(url: str) -> str:
    # Neon/Supabase/Render entregam "postgres://" ou "postgresql://"; usamos psycopg 3.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def engine_options(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    # Sem prepared statements: poolers em modo transação (Supabase, porta 6543) quebram com eles.
    return {"connect_args": {"prepare_threshold": None}, "pool_pre_ping": True}


_url = _normalize_url(settings.database_url)
engine = create_engine(_url, **engine_options(_url))
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """UTC sem tzinfo: é assim que tudo é guardado (SQLite não guarda fuso)."""
    return datetime.now(UTC).replace(tzinfo=None)


def to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(UTC).replace(tzinfo=None)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def get_session_factory() -> sessionmaker:
    return SessionLocal
