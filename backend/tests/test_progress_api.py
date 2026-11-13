from datetime import UTC, datetime, timedelta

from tests.helpers import session_body


def now():
    return datetime.now(UTC) - timedelta(seconds=5)


def test_progress_after_sessions(client, auth_headers):
    h = auth_headers()
    client.post("/sessions", json=session_body(topic="Cálculo", active=1500, end=now()), headers=h)
    client.post("/sessions", json=session_body(topic="Física", active=600, end=now()), headers=h)
    p = client.get("/progress", headers=h).json()
    assert p["studied_today"] is True
    assert p["streak"] == 1
    assert p["total_points"] == 10
    assert p["week_points"] == 10
    assert p["week_days"] == 1
    assert p["week_goal_days"] == 4
    assert {"topic": "Cálculo", "minutes": 25} in p["minutes_by_topic"]
    assert {"topic": "Física", "minutes": 10} in p["minutes_by_topic"]
    assert len(p["studied_days"]) == 1
    assert p["trails"] == []


def test_progress_empty_user(client, auth_headers):
    p = client.get("/progress", headers=auth_headers()).json()
    assert p["streak"] == 0 and p["studied_today"] is False
    assert p["total_points"] == 0 and p["minutes_by_topic"] == []


def test_session_returns_streak_change(client, auth_headers):
    h = auth_headers()
    first = client.post("/sessions", json=session_body(end=now()), headers=h).json()
    second = client.post("/sessions", json=session_body(end=now()), headers=h).json()
    assert (first["streak_before"], first["streak_after"]) == (0, 1)
    assert (second["streak_before"], second["streak_after"]) == (1, 1)
