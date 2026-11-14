from tests.helpers import session_body


def conclude(client, h, active, topic_id=None, client_id=None):
    body = session_body(active=active, topic="Inglês") | {"topic_id": topic_id}
    if client_id:
        body["client_id"] = client_id
    return client.post("/sessions", json=body, headers=h).json()


def test_conclusion_reports_topic_light_before_and_after(client, auth_headers):
    h = auth_headers()
    first = conclude(client, h, 1800)
    assert first["topic"]["title"] == "Inglês"
    assert first["topic"]["before"] == {"level": "Vinil", "progress": 0.0}
    assert first["topic"]["after"] == {"level": "Vinil", "progress": 0.5}
    assert first["topic"]["level_up"] is False and first["topic"]["max_level"] is False


def test_crossing_an_hour_is_a_level_up(client, auth_headers):
    h = auth_headers()
    topic_id = conclude(client, h, 1800)["topic"]["id"]
    second = conclude(client, h, 2400, topic_id)
    assert second["topic"]["before"]["level"] == "Vinil"
    assert second["topic"]["after"]["level"] == "Prata"
    assert second["topic"]["level_up"] is True


def test_reaching_farol_is_flagged_once(client, auth_headers):
    h = auth_headers()
    topic_id = None
    for _ in range(3):  # 3 × 13 h 20 = 40 h
        r = conclude(client, h, 48_000, topic_id)
        topic_id = r["topic"]["id"]
    assert r["topic"]["after"]["level"] == "Diamante"
    assert r["topic"]["max_level"] is True
    again = conclude(client, h, 1800, topic_id)
    assert again["topic"]["level_up"] is False and again["topic"]["max_level"] is False


def test_replayed_conclusion_reports_the_same_levels(client, auth_headers):
    h = auth_headers()
    topic_id = conclude(client, h, 1800)["topic"]["id"]
    first = conclude(client, h, 2400, topic_id, client_id="same-1")
    replay = conclude(client, h, 2400, topic_id, client_id="same-1")
    assert replay["topic"] == first["topic"]
