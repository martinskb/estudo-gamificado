from datetime import UTC, datetime, timedelta

from tests.helpers import session_body


def test_change_nickname(client, auth_headers):
    h = auth_headers("ana")
    r = client.patch("/me", json={"nickname": "Ana_Lume"}, headers=h)
    assert r.status_code == 200 and r.json()["nickname"] == "Ana_Lume"
    assert client.get("/me", headers=h).json()["nickname"] == "Ana_Lume"
    # o novo apelido entra com o mesmo PIN; o antigo fica livre
    assert client.post("/auth/enter", json={"nickname": "ana_lume", "pin": "1234"}).status_code == 200


def test_nickname_taken_or_invalid(client, auth_headers):
    auth_headers("bia")
    h = auth_headers("ana")
    assert client.patch("/me", json={"nickname": "BIA"}, headers=h).status_code == 409
    assert client.patch("/me", json={"nickname": "a b"}, headers=h).status_code == 422
    assert client.patch("/me", json={"nickname": "ANA"}, headers=h).status_code == 200  # só muda maiúsculas


def test_stats(client, auth_headers):
    h = auth_headers()
    now = datetime.now(UTC) - timedelta(minutes=1)
    for back in [6, 5, 4, 1, 0]:  # 3 seguidos, falha, 2 seguidos
        client.post("/sessions", json=session_body(active=1800, topic="Inglês", end=now - timedelta(days=back)), headers=h)
    client.post("/sessions", json=session_body(active=4000, topic="Violão", end=now), headers=h)
    s = client.get("/me/stats", headers=h).json()
    assert s["total_seconds"] == 5 * 1800 + 4000
    assert s["sessions"] == 6
    assert s["topics"] == 2
    assert s["longest_streak"] == 3
    assert s["best_level"] == {"name": "Prata", "topic": "Inglês"}
    assert s["member_since"]


def test_stats_for_new_account(client, auth_headers):
    s = client.get("/me/stats", headers=auth_headers()).json()
    assert (s["total_seconds"], s["sessions"], s["topics"], s["longest_streak"], s["best_level"]) == (0, 0, 0, 0, None)
