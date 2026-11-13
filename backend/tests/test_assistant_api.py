from sqlalchemy import select

from app.models import Event


def ask(client, h, question="O que é uma derivada?", topic="Cálculo"):
    return client.post("/assistant", json={"question": question, "topic": topic}, headers=h)


def test_assistant_answers_and_logs(client, auth_headers, fake_ai, session_factory):
    r = ask(client, auth_headers())
    assert r.status_code == 200
    assert r.json() == {"answer": "Resposta para: O que é uma derivada?", "remaining": 19}
    assert fake_ai.calls[-1] == ("answer", "O que é uma derivada?", "Cálculo")
    with session_factory() as db:
        event = db.scalar(select(Event).where(Event.kind == "assistant"))
    assert event.ok is True and event.latency_ms is not None
    assert "derivada" not in str(event.data)  # a pergunta em si não é guardada


def test_assistant_limit_20(client, auth_headers):
    h = auth_headers()
    for _ in range(20):
        assert ask(client, h).status_code == 200
    blocked = ask(client, h)
    assert blocked.status_code == 429
    assert ask(client, auth_headers("bia")).status_code == 200  # limite é por pessoa


def test_assistant_ai_error_503(client, auth_headers, fake_ai, session_factory):
    h = auth_headers()
    fake_ai.answer_fails = True
    r = ask(client, h)
    assert r.status_code == 503
    assert r.json()["detail"] == "Assistente indisponível, tente de novo"
    with session_factory() as db:
        assert db.scalar(select(Event).where(Event.kind == "assistant")).ok is False
    fake_ai.answer_fails = False
    assert ask(client, h).json()["remaining"] == 19  # a falha não gastou o limite


def test_assistant_validates_question(client, auth_headers):
    h = auth_headers()
    assert ask(client, h, question="   ").status_code == 422
    assert ask(client, h, question="x" * 1001).status_code == 422
