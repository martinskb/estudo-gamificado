import pytest

from app.models import Trail


def create(client, headers, topic, level="livre"):
    return client.post("/trails", json={"topic": topic, "level": level}, headers=headers)


@pytest.mark.parametrize("topic", ["ab", "x" * 121, "   "])
def test_topic_length_validated(client, auth_headers, topic):
    assert create(client, auth_headers(), topic).status_code == 422


def test_invalid_level_422(client, auth_headers):
    assert create(client, auth_headers(), "Cálculo I", level="mestrado").status_code == 422


def test_create_generates_trail_with_parts_and_videos(client, auth_headers):
    h = auth_headers()
    r = create(client, h, "Cálculo I", "superior")
    assert r.status_code == 200, r.text
    trail = client.get(f"/trails/{r.json()['trail_id']}", headers=h).json()
    assert trail["title"] == "Cálculo I"
    assert trail["status"] == "ready"
    assert len(trail["parts"]) == 4
    first = trail["parts"][0]
    assert first["order"] == 1 and len(first["videos"]) == 3
    assert set(first["videos"][0]) >= {"youtube_id", "title", "channel", "duration_s"}


def test_same_topic_reuses_trail(client, auth_headers, fake_ai):
    h = auth_headers()
    first = create(client, h, "Cálculo I").json()["trail_id"]
    second = create(client, h, "  calculo   i ").json()["trail_id"]
    assert first == second
    assert sum(c[0] == "split_topic" for c in fake_ai.calls) == 1


def test_failed_trail_is_regenerated_on_new_request(client, auth_headers, fake_ai):
    h = auth_headers()
    fake_ai.split_failures = 2
    trail_id = create(client, h, "Cálculo I").json()["trail_id"]
    assert client.get(f"/trails/{trail_id}", headers=h).json()["status"] == "failed"
    again = create(client, h, "Cálculo I").json()["trail_id"]
    assert again == trail_id
    assert client.get(f"/trails/{trail_id}", headers=h).json()["status"] == "ready"


def test_quota_failure_is_reported(client, auth_headers, fake_videos):
    h = auth_headers()
    fake_videos.quota = True
    trail_id = create(client, h, "Cálculo I").json()["trail_id"]
    trail = client.get(f"/trails/{trail_id}", headers=h).json()
    assert (trail["status"], trail["error"]) == ("failed", "quota")


def test_catalog_only_ready(client, auth_headers, session_factory):
    h = auth_headers()
    ready = create(client, h, "Cálculo I").json()["trail_id"]
    with session_factory() as db:
        db.add(Trail(title="Cálculo II", topic_norm="calculo ii", level="livre", status="generating"))
        db.add(Trail(title="Cálculo III", topic_norm="calculo iii", level="livre", status="failed"))
        db.commit()
    found = client.get("/catalog", params={"q": "calculo"}, headers=h).json()
    assert found == [{"trail_id": ready, "title": "Cálculo I"}]  # ana criou: aparece para ela


def test_catalog_without_query_lists_catalog_trails(client, auth_headers, session_factory):
    with session_factory() as db:
        db.add(Trail(title="Leis de Newton", topic_norm="leis de newton", level="vestibular", status="ready", is_catalog=True))
        db.add(Trail(title="Tema de usuário", topic_norm="tema de usuario", level="livre", status="ready"))
        db.commit()
    found = client.get("/catalog", headers=auth_headers()).json()
    assert [t["title"] for t in found] == ["Leis de Newton"]


def test_unknown_trail_404(client, auth_headers):
    assert client.get("/trails/999", headers=auth_headers()).status_code == 404


def test_trails_require_login(client):
    assert client.post("/trails", json={"topic": "Cálculo I", "level": "livre"}).status_code == 401


def test_catalog_search_hides_other_students_trails(client, auth_headers, session_factory):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    mine = create(client, ana, "Cálculo I").json()["trail_id"]
    with session_factory() as db:
        db.add(Trail(title="Cálculo curado", topic_norm="calculo curado", status="ready", is_catalog=True))
        db.commit()
    ana_sees = {t["title"] for t in client.get("/catalog", params={"q": "calculo"}, headers=ana).json()}
    bia_sees = {t["title"] for t in client.get("/catalog", params={"q": "calculo"}, headers=bia).json()}
    assert ana_sees == {"Cálculo I", "Cálculo curado"}
    assert bia_sees == {"Cálculo curado"}
    # quem digitar exatamente o mesmo tema ainda reaproveita a trilha
    assert create(client, bia, "calculo i").json()["trail_id"] == mine


def test_academic_level_is_accepted_and_searches_for_classes(client, auth_headers, fake_videos, fake_ai):
    h = auth_headers()
    r = create(client, h, "Estequiometria", level="academico")
    assert r.status_code == 200
    assert fake_videos.queries[0].endswith(" aula")
    assert ("split_topic", "Estequiometria", "academico") in fake_ai.calls
