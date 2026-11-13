import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db, get_session_factory
from app.main import create_app


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def app(session_factory):
    app = create_app()

    def _get_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    def _make(nickname: str = "ana", pin: str = "1234") -> dict:
        r = client.post("/auth/enter", json={"nickname": nickname, "pin": pin})
        assert r.status_code in (200, 201), r.text
        return {"Authorization": f"Bearer {r.json()['token']}"}

    return _make
