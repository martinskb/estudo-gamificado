import re
from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def clean_database_url(raw: str) -> str:
    """Aceita a URL do jeito que costuma ser colada no painel da hospedagem."""
    url = raw.strip()
    if url.startswith("DATABASE_URL="):
        url = url[len("DATABASE_URL="):].strip()
    if url.startswith("psql "):
        url = url[len("psql "):].strip()
    url = url.strip("'\"")
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


def engine_for(raw: str) -> Engine:
    url = clean_database_url(raw)
    try:
        return create_engine(url, **engine_options(url))
    except Exception as exc:
        # Mostra só o formato (letras e números viram o tamanho), nunca usuário ou senha.
        scheme, sep, rest = url.partition("://")
        if not sep or not re.fullmatch(r"[a-z+]+", scheme):
            scheme, sep, rest = "", "", url
        shape = scheme + sep + re.sub(r"[A-Za-z0-9_-]+", lambda m: f"<{len(m.group())}>", rest)
        raise RuntimeError(
            "DATABASE_URL inválida. Formato recebido: "
            f"{shape[:200]} — esperado: postgresql://USUARIO:SENHA@HOST/BANCO?sslmode=require"
        ) from exc


engine = engine_for(settings.database_url)
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
