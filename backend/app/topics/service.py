from sqlalchemy import Engine, func, inspect, select, text, update
from sqlalchemy.orm import Session, sessionmaker

from app.models import PALETTES, StudySession, Topic, Trail, UserTrail
from app.trails.catalog import normalize


def get_or_create_topic(db: Session, user_id: int, title: str, trail_id: int | None = None) -> Topic:
    title = " ".join(title.split())[:80]
    norm = normalize(title)[:80]
    topic = db.scalar(select(Topic).where(Topic.user_id == user_id, Topic.title_norm == norm))
    if topic is None:
        count = db.scalar(select(func.count()).select_from(Topic).where(Topic.user_id == user_id))
        topic = Topic(user_id=user_id, title=title, title_norm=norm, palette=PALETTES[count % len(PALETTES)])
        db.add(topic)
        db.flush()
    if trail_id is not None and topic.trail_id is None:
        topic.trail_id = trail_id
    return topic


def ensure_schema(engine: Engine) -> None:
    """create_all não adiciona coluna em tabela que já existe: adiciona study_sessions.topic_id."""
    columns = {c["name"] for c in inspect(engine).get_columns("study_sessions")}
    if "topic_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE study_sessions ADD COLUMN topic_id INTEGER"))


def backfill_topics(session_factory: sessionmaker) -> None:
    """Sessões e trilhas de antes da galeria viram temas (pode rodar quantas vezes quiser)."""
    with session_factory() as db:
        for user_id, trail_id, title in db.execute(
            select(UserTrail.user_id, Trail.id, Trail.title).join(Trail, Trail.id == UserTrail.trail_id)
        ).all():
            get_or_create_topic(db, user_id, title, trail_id)
        pending = db.execute(
            select(StudySession.user_id, StudySession.topic).where(StudySession.topic_id.is_(None)).distinct()
        ).all()
        for user_id, title in pending:
            topic = get_or_create_topic(db, user_id, title)
            db.execute(
                update(StudySession)
                .where(StudySession.user_id == user_id, StudySession.topic == title, StudySession.topic_id.is_(None))
                .values(topic_id=topic.id)
            )
        db.commit()
