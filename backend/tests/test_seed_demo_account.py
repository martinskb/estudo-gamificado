from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import PartDone, StudySession, User, UserTrail
from app.progress.streak import compute_streak
from scripts.seed_demo_account import seed_demo_account
from tests.test_parts_api import make_trail

DEMO = date(2026, 11, 16)  # segunda-feira da apresentação


def test_history_keeps_a_streak_with_one_saved_day_until_the_day_before_the_demo(client, auth_headers, session_factory):
    auth_headers("Beater", "2022")
    trail_id = make_trail(client, auth_headers("Beater", "2022"), "Leis de Newton")["id"]
    seed_demo_account("beater", DEMO, [trail_id], session_factory)
    with session_factory() as db:
        user = db.scalar(select(User).where(User.nickname_lower == "beater"))
        days = set(db.scalars(select(StudySession.day).where(StudySession.user_id == user.id)))
        scored = db.scalars(select(StudySession).where(StudySession.user_id == user.id, StudySession.points > 0)).all()
    assert DEMO not in days  # o dia da demo fica livre para estudar ao vivo
    state = compute_streak(days, DEMO)
    assert state.streak >= 12 and len(state.saved_days) == 1 and not state.studied_today
    per_day: dict = {}
    for s in scored:
        per_day[s.day] = per_day.get(s.day, 0) + 1
    assert max(per_day.values()) <= 3
    assert user.in_ranking is True


def test_history_puts_progress_on_the_trails_and_is_idempotent(client, auth_headers, session_factory):
    h = auth_headers("Beater", "2022")
    trail = make_trail(client, h, "Leis de Newton")
    seed_demo_account("beater", DEMO, [trail["id"]], session_factory)
    seed_demo_account("beater", DEMO, [trail["id"]], session_factory)
    with session_factory() as db:
        user = db.scalar(select(User).where(User.nickname_lower == "beater"))
        done = db.scalars(select(PartDone.part_id).where(PartDone.user_id == user.id)).all()
        enrolled = db.scalars(select(UserTrail.trail_id).where(UserTrail.user_id == user.id)).all()
        seeded = db.scalars(select(StudySession).where(StudySession.user_id == user.id)).all()
    assert enrolled == [trail["id"]]


def test_main_trail_is_the_one_the_home_continues(client, auth_headers, session_factory):
    from app.trails.router import user_trails

    h = auth_headers("Beater", "2022")
    newton = make_trail(client, h, "Leis de Newton")["id"]
    other = make_trail(client, h, "Funções do 1º grau")["id"]
    mine = make_trail(client, h, "Tema próprio da conta")["id"]  # criado antes, pela própria pessoa
    seed_demo_account("beater", DEMO, [newton, other], session_factory)
    with session_factory() as db:
        user = db.scalar(select(User).where(User.nickname_lower == "beater"))
        order = [t["trail_id"] for t in user_trails(db, user.id)]
    assert order[0] == newton and set(order) == {newton, other, mine}
    assert len(done) == 2  # parte 3 fica como "continue de onde parou"
    first_part = trail["parts"][0]["id"]
    assert any(s.part_id == first_part for s in seeded)
    assert len({s.client_id for s in seeded}) == len(seeded)
    again = len(seeded)
    seed_demo_account("beater", DEMO, [trail["id"]], session_factory)
    with session_factory() as db:
        assert len(db.scalars(select(StudySession).where(StudySession.user_id == user.id)).all()) == again


def test_missing_account_is_reported(session_factory):
    with pytest.raises(LookupError):
        seed_demo_account("ninguem", DEMO, [], session_factory)
