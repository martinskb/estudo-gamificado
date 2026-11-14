import base64

from sqlalchemy import select

from app.models import StudySession, Topic
from tests.helpers import session_body

PIXEL = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"x" * 2000).decode()


def new_topic(client, h, title="Inglês", palette=None):
    body = {"title": title} | ({"palette": palette} if palette else {})
    return client.post("/topics", json=body, headers=h)


def test_create_topic_is_instant_and_needs_no_ai(client, auth_headers, fake_ai):
    r = new_topic(client, auth_headers())
    assert r.status_code == 201
    t = r.json()
    assert t["title"] == "Inglês" and t["total_seconds"] == 0 and t["sessions"] == 0
    assert t["level"]["name"] == "Acendendo" and t["palette"] == "indigo" and t["cover"] is None
    assert fake_ai.calls == []


def test_same_title_returns_existing_topic(client, auth_headers):
    h = auth_headers()
    first = new_topic(client, h, "Inglês").json()
    again = new_topic(client, h, "  inglês ")
    assert again.status_code == 200 and again.json()["id"] == first["id"]


def test_title_validation(client, auth_headers):
    h = auth_headers()
    assert new_topic(client, h, "").status_code == 422
    assert new_topic(client, h, "x" * 81).status_code == 422
    assert new_topic(client, h, "Inglês", palette="arco-iris").status_code == 422


def test_sessions_feed_topic_totals_level_and_streak(client, auth_headers):
    h = auth_headers()
    topic = new_topic(client, h).json()
    client.post("/sessions", json=session_body(active=3000, topic="Inglês") | {"topic_id": topic["id"]}, headers=h)
    client.post("/sessions", json=session_body(active=1000, topic="Inglês") | {"topic_id": topic["id"]}, headers=h)
    detail = client.get(f"/topics/{topic['id']}", headers=h).json()
    assert detail["total_seconds"] == 4000 and detail["sessions"] == 2
    assert detail["level"]["name"] == "Faísca"
    assert [s["active_seconds"] for s in detail["tracks"]] == [1000, 3000] or len(detail["tracks"]) == 2
    assert detail["last_day"] == "2026-11-10"


def test_session_without_topic_id_finds_or_creates_topic_by_name(client, auth_headers, session_factory):
    h = auth_headers()
    client.post("/sessions", json=session_body(topic="Violão"), headers=h)
    client.post("/sessions", json=session_body(topic="violão"), headers=h)
    topics = client.get("/topics", headers=h).json()
    assert [t["title"] for t in topics] == ["Violão"]
    assert topics[0]["sessions"] == 2


def test_cannot_use_someone_elses_topic(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    topic = new_topic(client, ana).json()
    r = client.post("/sessions", json=session_body() | {"topic_id": topic["id"]}, headers=bia)
    assert r.status_code == 404
    assert client.get(f"/topics/{topic['id']}", headers=bia).status_code == 404
    assert client.get("/topics", headers=bia).json() == []


def test_update_cover_palette_title_and_done(client, auth_headers):
    h = auth_headers()
    topic = new_topic(client, h).json()
    r = client.patch(f"/topics/{topic['id']}", json={"cover": PIXEL, "palette": "coral", "title": "Inglês B1", "done": True}, headers=h)
    assert r.status_code == 200
    t = r.json()
    assert (t["cover"], t["palette"], t["title"], t["done"]) == (PIXEL, "coral", "Inglês B1", True)
    t = client.patch(f"/topics/{topic['id']}", json={"cover": None}, headers=h).json()
    assert t["cover"] is None and t["palette"] == "coral"


def test_cover_must_be_a_small_image_data_url(client, auth_headers):
    h = auth_headers()
    topic = new_topic(client, h).json()
    big = "data:image/jpeg;base64," + base64.b64encode(b"x" * 200_000).decode()
    for bad in ["https://exemplo.com/foto.jpg", "data:text/html;base64,PGgxPg==", big, "data:image/jpeg;base64,@@@"]:
        assert client.patch(f"/topics/{topic['id']}", json={"cover": bad}, headers=h).status_code == 422


def test_list_sorting(client, auth_headers):
    h = auth_headers()
    a = new_topic(client, h, "A").json()
    b = new_topic(client, h, "B").json()
    client.post("/sessions", json=session_body(active=600) | {"topic_id": a["id"]}, headers=h)
    client.post("/sessions", json=session_body(active=3000) | {"topic_id": b["id"]}, headers=h)
    client.patch(f"/topics/{a['id']}", json={"done": True}, headers=h)
    assert [t["title"] for t in client.get("/topics?sort=time", headers=h).json()] == ["B", "A"]
    assert [t["title"] for t in client.get("/topics?sort=done", headers=h).json()] == ["A"]
    recent = client.get("/topics", headers=h).json()
    assert {t["title"] for t in recent} == {"A", "B"}


def test_delete_topic_keeps_sessions(client, auth_headers, session_factory):
    h = auth_headers()
    topic = new_topic(client, h).json()
    client.post("/sessions", json=session_body() | {"topic_id": topic["id"]}, headers=h)
    assert client.delete(f"/topics/{topic['id']}", headers=h).status_code == 204
    with session_factory() as db:
        assert db.scalar(select(Topic)) is None
        assert db.scalar(select(StudySession)).topic_id is None
    assert client.get("/progress", headers=h).json()["total_points"] == 10


def test_trail_links_to_topic(client, auth_headers):
    h = auth_headers()
    trail_id = client.post("/trails", json={"topic": "Cálculo I", "level": "superior"}, headers=h).json()["trail_id"]
    topics = client.get("/topics", headers=h).json()
    assert [(t["title"], t["trail_id"]) for t in topics] == [("Cálculo I", trail_id)]
    detail = client.get(f"/topics/{topics[0]['id']}", headers=h).json()
    assert detail["trail"] == {"id": trail_id, "parts_done": 0, "parts_total": 4, "next_part": 1}
