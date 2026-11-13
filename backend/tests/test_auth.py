import pytest


def enter(client, nickname, pin):
    return client.post("/auth/enter", json={"nickname": nickname, "pin": pin})


def test_new_nickname_creates_account(client):
    r = enter(client, "Ana_1", "1234")
    assert r.status_code == 201
    assert r.json()["token"]
    assert r.json()["user"]["nickname"] == "Ana_1"


def test_same_nickname_any_case_logs_in(client):
    first = enter(client, "Ana_1", "1234")
    again = enter(client, "ana_1", "1234")
    assert again.status_code == 200
    assert again.json()["user"]["id"] == first.json()["user"]["id"]


def test_wrong_pin_401(client):
    enter(client, "Ana_1", "1234")
    assert enter(client, "Ana_1", "9999").status_code == 401


def test_lockout_after_5_wrong(client):
    enter(client, "Ana_1", "1234")
    for _ in range(5):
        enter(client, "Ana_1", "9999")
    assert enter(client, "Ana_1", "1234").status_code == 429


@pytest.mark.parametrize(
    "nickname,pin",
    [("ab", "1234"), ("a b", "1234"), ("ana", "12a4"), ("ana", "12345")],
)
def test_invalid_formats_422(client, nickname, pin):
    assert enter(client, nickname, pin).status_code == 422


def test_me_requires_token(client, auth_headers):
    assert client.get("/me").status_code == 401
    r = client.get("/me", headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["week_goal_days"] == 4
    assert r.json()["in_ranking"] is False
