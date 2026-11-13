from tests.helpers import session_body


def make_trail(client, h, topic="Cálculo I"):
    trail_id = client.post("/trails", json={"topic": topic, "level": "livre"}, headers=h).json()["trail_id"]
    return client.get(f"/trails/{trail_id}", headers=h).json()


def test_done_requires_session(client, auth_headers):
    h = auth_headers()
    trail = make_trail(client, h)
    part_id = trail["parts"][0]["id"]
    r = client.post(f"/parts/{part_id}/done", headers=h)
    assert r.status_code == 409
    assert r.json()["detail"] == "Estude ao menos uma sessão nesta parte"
    client.post("/sessions", json=session_body(part_id=part_id), headers=h)
    assert client.post(f"/parts/{part_id}/done", headers=h).status_code == 200
    assert client.post(f"/parts/{part_id}/done", headers=h).status_code == 200  # repetir não quebra


def test_someone_elses_session_does_not_unlock_part(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    part_id = make_trail(client, ana)["parts"][0]["id"]
    client.post("/sessions", json=session_body(part_id=part_id), headers=ana)
    assert client.post(f"/parts/{part_id}/done", headers=bia).status_code == 409


def test_trail_shows_done_per_user(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    trail = make_trail(client, ana)
    part_id = trail["parts"][0]["id"]
    assert trail["parts"][0]["done"] is False
    client.post("/sessions", json=session_body(part_id=part_id), headers=ana)
    client.post(f"/parts/{part_id}/done", headers=ana)
    assert client.get(f"/trails/{trail['id']}", headers=ana).json()["parts"][0]["done"] is True
    assert client.get(f"/trails/{trail['id']}", headers=bia).json()["parts"][0]["done"] is False


def test_progress_lists_trail_counts(client, auth_headers):
    h = auth_headers()
    trail = make_trail(client, h)
    part_id = trail["parts"][0]["id"]
    client.post("/sessions", json=session_body(part_id=part_id), headers=h)
    client.post(f"/parts/{part_id}/done", headers=h)
    expected = [{"trail_id": trail["id"], "title": "Cálculo I", "parts_done": 1, "parts_total": 4}]
    assert client.get("/progress", headers=h).json()["trails"] == expected
    assert client.get("/me/trails", headers=h).json() == expected


def test_start_enrolls_in_existing_trail_once(client, auth_headers):
    ana, bia = auth_headers("ana"), auth_headers("bia")
    trail = make_trail(client, ana)
    assert client.get("/me/trails", headers=bia).json() == []
    assert client.post(f"/trails/{trail['id']}/start", headers=bia).status_code == 200
    assert client.post(f"/trails/{trail['id']}/start", headers=bia).status_code == 200
    assert len(client.get("/me/trails", headers=bia).json()) == 1


def test_unknown_part_and_trail_404(client, auth_headers):
    h = auth_headers()
    assert client.post("/parts/999/done", headers=h).status_code == 404
    assert client.post("/trails/999/start", headers=h).status_code == 404
