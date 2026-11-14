from sqlalchemy import func, select

from app.models import StudySession, User
from scripts.seed_demo_users import DEMO_NICKNAMES, seed_demo_users


def test_seed_demo_users_fills_ranking_and_is_rerunnable(client, auth_headers, session_factory):
    seed_demo_users(session_factory)
    seed_demo_users(session_factory)
    with session_factory() as db:
        users = db.scalars(select(User)).all()
        sessions = db.scalar(select(func.count()).select_from(StudySession))
    assert sorted(u.nickname for u in users) == sorted(DEMO_NICKNAMES)
    assert all(u.in_ranking for u in users)
    assert sessions >= len(DEMO_NICKNAMES) * 5
    top = client.get("/ranking", headers=auth_headers("ana")).json()["top"]
    assert len(top) == len(DEMO_NICKNAMES)
    assert all(row["week_points"] <= 30 * 7 for row in top)  # respeita o teto de 3 sessões/dia


def test_demo_users_cannot_be_logged_into_with_a_guessable_pin(client, session_factory):
    seed_demo_users(session_factory)
    for pin in ("0000", "1234"):
        assert client.post("/auth/enter", json={"nickname": DEMO_NICKNAMES[0], "pin": pin}).status_code == 401


def test_top_up_keeps_demo_users_active_into_demo_morning(client, auth_headers, session_factory):
    from datetime import date

    from scripts.seed_demo_users import top_up_demo_users

    seed_demo_users(session_factory)
    demo = date(2026, 11, 16)
    top_up_demo_users(session_factory, through=demo)
    top_up_demo_users(session_factory, through=demo)  # pode rodar de novo
    with session_factory() as db:
        monday = db.scalars(select(StudySession).where(StudySession.day == demo)).all()
    assert {s.user_id for s in monday} and len({s.user_id for s in monday}) == len(DEMO_NICKNAMES)
    assert all(s.ended_at.hour < 11 for s in monday)  # antes das 8h em Belém (11h UTC)
    assert all(s.points == 10 for s in monday)
