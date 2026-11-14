"""Testes das correções pedidas pela revisão do branch."""
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from app.db import engine_options, get_db
from app.models import Exercise
from app.study.rules import today_belem
from tests.helpers import session_body
from tests.test_parts_api import make_trail


def test_postgres_engine_disables_prepared_statements():
    # poolers em modo transação (Supabase 6543) quebram com prepared statements do psycopg 3
    assert engine_options("postgresql+psycopg://u:p@h/db")["connect_args"] == {"prepare_threshold": None}
    assert engine_options("sqlite:///x.db")["connect_args"] == {"check_same_thread": False}


def test_session_paused_overnight_is_saved(client, auth_headers):
    end = datetime.now(UTC) - timedelta(seconds=5)
    body = session_body(active=3600, end=end)
    body["started_at"] = (end - timedelta(hours=17)).isoformat()
    r = client.post("/sessions", json=body, headers=auth_headers())
    assert r.status_code == 200, r.text
    assert r.json()["points"] == 10


def test_device_clock_ahead_is_clamped_to_now(client, auth_headers):
    h = auth_headers()
    end = datetime.now(UTC) + timedelta(hours=30)
    r = client.post("/sessions", json=session_body(active=1500, end=end), headers=h)
    assert r.status_code == 200, r.text
    assert client.get("/sessions", headers=h).json()[0]["day"] == today_belem().isoformat()


def test_quiz_is_generated_on_demand_when_part_has_none(client, auth_headers, session_factory, fake_ai):
    h = auth_headers()
    part_id = make_trail(client, h)["parts"][0]["id"]
    with session_factory() as db:
        db.execute(delete(Exercise).where(Exercise.part_id == part_id))
        db.commit()
    before = sum(c[0] == "topic_quiz" for c in fake_ai.calls)
    quiz = client.get(f"/parts/{part_id}/quiz", headers=h).json()
    assert len(quiz) == 4 and all(q["source"] == "topic" for q in quiz)
    client.get(f"/parts/{part_id}/quiz", headers=h)  # já guardado: não chama a IA de novo
    assert sum(c[0] == "topic_quiz" for c in fake_ai.calls) == before + 1


def test_quiz_backfill_failure_returns_empty_list(client, auth_headers, session_factory, fake_ai):
    h = auth_headers()
    part_id = make_trail(client, h)["parts"][0]["id"]
    with session_factory() as db:
        db.execute(delete(Exercise).where(Exercise.part_id == part_id))
        db.commit()
    fake_ai.topic_quiz_fails = True
    r = client.get(f"/parts/{part_id}/quiz", headers=h)
    assert r.status_code == 200 and r.json() == []


def new_trail(client, h, topic):
    return client.post("/trails", json={"topic": topic, "level": "livre"}, headers=h)


def test_new_trails_capped_at_3_per_user_per_day(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    assert new_trail(client, ana, "Tema um").status_code == 200
    assert new_trail(client, ana, "Tema dois").status_code == 200
    assert new_trail(client, ana, "Tema quatro").status_code == 200
    blocked = new_trail(client, ana, "Tema três")
    assert blocked.status_code == 429
    assert "trilhas novas hoje" in blocked.json()["detail"]
    assert new_trail(client, ana, "tema um").status_code == 200  # trilha que já existe não conta
    assert new_trail(client, bia, "Tema dois").status_code == 200  # nem a que outra pessoa criou
    assert new_trail(client, bia, "Tema três").status_code == 200


def test_failed_trails_do_not_count_toward_cap(client, auth_headers, fake_ai):
    h = auth_headers()
    fake_ai.split_failures = 2
    new_trail(client, h, "Tema que falha")
    assert new_trail(client, h, "Tema um").status_code == 200
    assert new_trail(client, h, "Tema dois").status_code == 200


def test_assistant_releases_db_transaction_during_ai_call(app, client, auth_headers, session_factory, fake_ai):
    h = auth_headers()
    sessions, states = [], []

    def _get_db():
        with session_factory() as db:
            sessions.append(db)
            yield db

    app.dependency_overrides[get_db] = _get_db
    original = fake_ai.answer
    fake_ai.answer = lambda q, t: (states.append(sessions[-1].in_transaction()), original(q, t))[1]
    r = client.post("/assistant", json={"question": "O que é limite?"}, headers=h)
    assert r.status_code == 200
    assert states == [False]


def test_cors_origins_tolerate_spaces_and_trailing_slash():
    from app.main import parse_origins

    assert parse_origins(" https://meu-app.vercel.app/ , http://localhost:5173,") == [
        "https://meu-app.vercel.app",
        "http://localhost:5173",
    ]


def test_daily_trail_limit_comes_from_settings(client, auth_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "new_trails_per_day", 1)
    h = auth_headers()
    assert new_trail(client, h, "Tema um").status_code == 200
    blocked = new_trail(client, h, "Tema dois")
    assert blocked.status_code == 429 and "1 trilha nova hoje" in blocked.json()["detail"]
