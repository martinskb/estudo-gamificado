from sqlalchemy import select

from app.models import Attempt, Exercise, Video
from tests.test_parts_api import make_trail


def first_part(client, h):
    return make_trail(client, h)["parts"][0]["id"]


def test_quiz_hides_answer(client, auth_headers):
    h = auth_headers()
    quiz = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()
    assert len(quiz) == 4
    for item in quiz:
        assert set(item) == {"id", "question", "options", "source"}
        assert len(item["options"]) == 4


def test_answer_reveals_result_and_explanation(client, auth_headers, session_factory):
    h = auth_headers()
    item = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()[0]
    with session_factory() as db:
        correct = db.get(Exercise, item["id"]).correct_index
    right = client.post(f"/exercises/{item['id']}/answer", json={"choice": correct}, headers=h).json()
    wrong = client.post(f"/exercises/{item['id']}/answer", json={"choice": (correct + 1) % 4}, headers=h).json()
    assert right == {"correct": True, "correct_index": correct, "explanation": right["explanation"]}
    assert right["explanation"]
    assert wrong["correct"] is False and wrong["correct_index"] == correct
    with session_factory() as db:
        assert [a.correct for a in db.scalars(select(Attempt).order_by(Attempt.id))] == [True, False]


def test_answer_does_not_change_points(client, auth_headers, session_factory):
    h = auth_headers()
    item = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()[0]
    before = client.get("/progress", headers=h).json()["total_points"]
    with session_factory() as db:
        correct = db.get(Exercise, item["id"]).correct_index
    client.post(f"/exercises/{item['id']}/answer", json={"choice": correct}, headers=h)
    assert client.get("/progress", headers=h).json()["total_points"] == before


def test_prefers_video_exercises(client, auth_headers):
    # a análise de vídeo roda junto com a criação (fakes): cada parte tem 4 do vídeo + 4 do assunto
    h = auth_headers()
    quiz = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()
    assert [q["source"] for q in quiz] == ["video"] * 4


def test_falls_back_to_topic_exercises(client, auth_headers, fake_ai):
    h = auth_headers()
    fake_ai.video_quiz_fails = True
    quiz = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()
    assert [q["source"] for q in quiz] == ["topic"] * 4


def test_invalid_choice_and_unknown_ids(client, auth_headers):
    h = auth_headers()
    item = client.get(f"/parts/{first_part(client, h)}/quiz", headers=h).json()[0]
    assert client.post(f"/exercises/{item['id']}/answer", json={"choice": 4}, headers=h).status_code == 422
    assert client.post("/exercises/9999/answer", json={"choice": 0}, headers=h).status_code == 404
    assert client.get("/parts/9999/quiz", headers=h).status_code == 404
