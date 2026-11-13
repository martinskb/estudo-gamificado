from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import StudySession
from tests.helpers import session_body


def test_conclude_awards_points(client, auth_headers):
    r = client.post("/sessions", json=session_body(active=1500, goal=25), headers=auth_headers())
    assert r.status_code == 200, r.text
    assert r.json()["points"] == 10
    assert r.json()["goal_met"] is True


def test_short_session_recorded_without_points(client, auth_headers):
    h = auth_headers()
    r = client.post("/sessions", json=session_body(active=600, goal=25), headers=h)
    assert r.json()["points"] == 0
    assert r.json()["goal_met"] is False
    assert len(client.get("/sessions", headers=h).json()) == 1


def test_fourth_scored_session_same_day_zero_points(client, auth_headers):
    h = auth_headers()
    base = datetime(2026, 11, 10, 12, 0, tzinfo=UTC)
    points = [
        client.post(
            "/sessions",
            json=session_body(active=1300, end=base + timedelta(hours=i)),
            headers=h,
        ).json()["points"]
        for i in range(4)
    ]
    assert points == [10, 10, 10, 0]


def test_conclude_is_idempotent(client, auth_headers, session_factory):
    h = auth_headers()
    body = session_body(client_id="abc-123")
    first = client.post("/sessions", json=body, headers=h)
    second = client.post("/sessions", json=body, headers=h)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    with session_factory() as db:
        assert db.scalar(select(func.count()).select_from(StudySession)) == 1
        assert db.scalar(select(func.sum(StudySession.points))) == 10


def test_active_seconds_cannot_exceed_wall_time(client, auth_headers):
    body = session_body(active=1500)
    body["active_seconds"] = 1500 + 6
    assert client.post("/sessions", json=body, headers=auth_headers()).status_code == 422


def test_history_filters_by_topic(client, auth_headers):
    h = auth_headers()
    client.post("/sessions", json=session_body(topic="Cálculo", note="limites"), headers=h)
    client.post("/sessions", json=session_body(topic="Física"), headers=h)
    r = client.get("/sessions", params={"topic": "Cálculo"}, headers=h)
    assert [s["topic"] for s in r.json()] == ["Cálculo"]
    assert r.json()[0]["note"] == "limites"
    assert r.json()[0]["day"] == "2026-11-10"


def test_history_is_private(client, auth_headers):
    client.post("/sessions", json=session_body(), headers=auth_headers("ana"))
    assert client.get("/sessions", headers=auth_headers("bia")).json() == []


def test_settings_update(client, auth_headers):
    h = auth_headers()
    r = client.put("/me/settings", json={"week_goal_days": 6, "in_ranking": True}, headers=h)
    assert r.status_code == 200
    me = client.get("/me", headers=h).json()
    assert me["week_goal_days"] == 6 and me["in_ranking"] is True
    assert client.put("/me/settings", json={"week_goal_days": 8}, headers=h).status_code == 422
