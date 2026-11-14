from datetime import date, datetime

from sqlalchemy import select

from app.models import StudySession, Topic, Trail, User, UserTrail
from app.topics.service import backfill_topics


def session(user_id, topic, n):
    end = datetime(2026, 11, 10, 15, n)
    return StudySession(client_id=f"c{user_id}{n}", user_id=user_id, topic=topic, goal_minutes=25,
                        started_at=end, ended_at=end, active_seconds=600, day=date(2026, 11, 10))


def test_backfill_creates_topics_from_old_sessions_and_trails(session_factory):
    with session_factory() as db:
        ana = User(nickname="ana", nickname_lower="ana", pin_hash="x")
        bia = User(nickname="bia", nickname_lower="bia", pin_hash="x")
        trail = Trail(title="Leis de Newton", topic_norm="leis de newton", status="ready")
        db.add_all([ana, bia, trail])
        db.flush()
        db.add_all([session(ana.id, "Inglês", 1), session(ana.id, "inglês", 2), session(bia.id, "Inglês", 3),
                    session(ana.id, "Leis de Newton", 4), UserTrail(user_id=ana.id, trail_id=trail.id)])
        db.commit()
        ana_id, trail_id = ana.id, trail.id

    backfill_topics(session_factory)
    backfill_topics(session_factory)  # rodar de novo não duplica

    with session_factory() as db:
        topics = db.scalars(select(Topic).order_by(Topic.user_id, Topic.title)).all()
        assert [(t.user_id, t.title, t.trail_id) for t in topics] == [
            (ana_id, "Inglês", None), (ana_id, "Leis de Newton", trail_id), (ana_id + 1, "Inglês", None)
        ]
        assert db.scalar(select(StudySession).where(StudySession.topic_id.is_(None))) is None


def test_ensure_schema_adds_topic_column_to_an_old_database():
    from sqlalchemy import create_engine, inspect, text

    from app.topics.service import ensure_schema

    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE study_sessions (id INTEGER PRIMARY KEY, topic VARCHAR(120))"))
    ensure_schema(engine)
    ensure_schema(engine)  # segunda vez não quebra
    assert "topic_id" in {c["name"] for c in inspect(engine).get_columns("study_sessions")}
