from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db, to_naive_utc, utcnow
from app.events import log_event
from app.models import StudySession, Topic, User
from app.topics.levels import level_for
from app.topics.service import get_or_create_topic
from app.progress.streak import compute_streak
from app.study.rules import goal_met, points_for_session, study_day, today_belem

router = APIRouter()

CLOCK_SLACK_SECONDS = 5


class SessionIn(BaseModel):
    client_id: str = Field(min_length=1, max_length=64)
    topic: str = Field(min_length=1, max_length=120)
    part_id: int | None = None
    topic_id: int | None = None
    goal_minutes: int = Field(ge=1, le=600)
    started_at: datetime
    ended_at: datetime
    active_seconds: int = Field(ge=0)
    note: str | None = Field(default=None, max_length=500)


class SettingsIn(BaseModel):
    week_goal_days: int | None = Field(default=None, ge=1, le=7)
    in_ranking: bool | None = None


def _topic_light(db: Session, s: StudySession) -> dict | None:
    """Nível do disco do tema antes e depois desta sessão (estável: reenviar a mesma sessão dá o mesmo)."""
    if s.topic_id is None:
        return None
    after_seconds = db.scalar(
        select(func.coalesce(func.sum(StudySession.active_seconds), 0)).where(
            StudySession.topic_id == s.topic_id, StudySession.id <= s.id
        )
    )
    before, after = level_for(after_seconds - s.active_seconds), level_for(after_seconds)
    return {
        "id": s.topic_id,
        "title": s.topic,
        "before": {"level": before.name, "progress": before.progress},
        "after": {"level": after.name, "progress": after.progress},
        "level_up": before.name != after.name,
        "max_level": before.next_name is not None and after.next_name is None,
    }


def _conclusion(db: Session, s: StudySession) -> dict:
    return {
        "id": s.id,
        "points": s.points,
        "goal_met": s.goal_met,
        "streak_before": s.streak_before,
        "streak_after": s.streak_after,
        "topic": _topic_light(db, s),
    }


def _existing(db: Session, user_id: int, client_id: str) -> StudySession | None:
    return db.scalar(
        select(StudySession).where(
            StudySession.user_id == user_id, StudySession.client_id == client_id
        )
    )


@router.post("/sessions")
def conclude_session(
    body: SessionIn, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    # Reenvio (toque duplo, rede ruim): devolve a mesma sessão, sem pontuar de novo.
    if (dup := _existing(db, user.id, body.client_id)) is not None:
        return _conclusion(db, dup)

    started, ended = to_naive_utc(body.started_at), to_naive_utc(body.ended_at)
    wall = (ended - started).total_seconds()
    if wall < 0:
        raise HTTPException(422, "Horários da sessão inválidos")
    if body.active_seconds > wall + CLOCK_SLACK_SECONDS:
        raise HTTPException(422, "Tempo estudado maior que a duração da sessão")
    # Relógio do aparelho adiantado: traz a sessão para agora em vez de recusar
    # (recusar deixaria o aluno sem conseguir salvar o que estudou).
    ahead = ended - utcnow()
    if ahead > timedelta(minutes=5):
        started, ended = started - ahead, ended - ahead

    if body.topic_id is not None:
        topic = db.get(Topic, body.topic_id)
        if topic is None or topic.user_id != user.id:
            raise HTTPException(404, "Tema não encontrado")
    else:
        topic = get_or_create_topic(db, user.id, body.topic)

    day = study_day(ended)
    scored_today = db.scalar(
        select(func.count())
        .select_from(StudySession)
        .where(
            StudySession.user_id == user.id,
            StudySession.day == day,
            StudySession.points > 0,
        )
    )
    today = today_belem()
    days_before = set(
        db.scalars(select(StudySession.day).where(StudySession.user_id == user.id).distinct())
    )
    session = StudySession(
        client_id=body.client_id,
        user_id=user.id,
        topic=topic.title,
        topic_id=topic.id,
        part_id=body.part_id,
        goal_minutes=body.goal_minutes,
        started_at=started,
        ended_at=ended,
        active_seconds=body.active_seconds,
        note=(body.note or "").strip() or None,
        points=points_for_session(body.active_seconds, scored_today),
        goal_met=goal_met(body.active_seconds, body.goal_minutes),
        day=day,
        streak_before=compute_streak(days_before, today).streak,
        streak_after=compute_streak(days_before | {day}, today).streak,
    )
    db.add(session)
    log_event(
        db,
        "session_concluded",
        user_id=user.id,
        active_seconds=body.active_seconds,
        points=session.points,
        goal_met=session.goal_met,
    )
    try:
        db.commit()
    except IntegrityError:  # duas requisições iguais ao mesmo tempo
        db.rollback()
        return _conclusion(db, _existing(db, user.id, body.client_id))
    return _conclusion(db, session)


@router.get("/sessions")
def list_sessions(
    topic: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(StudySession).where(StudySession.user_id == user.id)
    if topic:
        query = query.where(StudySession.topic == topic)
    rows = db.scalars(query.order_by(StudySession.ended_at.desc()).limit(200))
    return [
        {
            "id": s.id,
            "topic": s.topic,
            "part_id": s.part_id,
            "day": s.day.isoformat(),
            "active_seconds": s.active_seconds,
            "goal_minutes": s.goal_minutes,
            "goal_met": s.goal_met,
            "points": s.points,
            "note": s.note,
        }
        for s in rows
    ]


@router.put("/me/settings")
def update_settings(
    body: SettingsIn, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if body.week_goal_days is not None:
        user.week_goal_days = body.week_goal_days
    if body.in_ranking is not None:
        user.in_ranking = body.in_ranking
    db.commit()
    return {"week_goal_days": user.week_goal_days, "in_ranking": user.in_ranking}
