from datetime import UTC, datetime, timedelta

from tests.helpers import session_body


def study(client, h, times=1):
    for i in range(times):
        end = datetime.now(UTC) - timedelta(seconds=5 + i)
        client.post("/sessions", json=session_body(active=1500, end=end), headers=h)


def join(client, h):
    client.put("/me/settings", json={"in_ranking": True}, headers=h)


def test_ranking_only_opt_in(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    study(client, ana, 2)
    study(client, bia, 1)
    join(client, bia)
    r = client.get("/ranking", headers=ana).json()
    assert [row["nickname"] for row in r["top"]] == ["bia"]
    assert r["me"] is None


def test_ranking_orders_by_week_points_and_reports_my_position(client, auth_headers):
    ana, bia, caio = auth_headers("ana"), auth_headers("bia"), auth_headers("caio")
    for h in (ana, bia, caio):
        join(client, h)
    study(client, ana, 1)
    study(client, bia, 3)
    r = client.get("/ranking", headers=ana).json()
    assert [(row["nickname"], row["week_points"], row["streak"]) for row in r["top"]] == [
        ("bia", 30, 1),
        ("ana", 10, 1),
        ("caio", 0, 0),
    ]
    assert r["me"] == {"position": 2, "week_points": 10}


def test_ranking_ignores_points_from_previous_weeks(client, auth_headers):
    ana = auth_headers("ana")
    join(client, ana)
    old = datetime.now(UTC) - timedelta(days=8)
    client.post("/sessions", json=session_body(active=1500, end=old), headers=ana)
    assert client.get("/ranking", headers=ana).json()["top"][0]["week_points"] == 0
