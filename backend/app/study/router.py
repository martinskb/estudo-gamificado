from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db, to_naive_utc, utcnow
from app.events import log_event
from app.models import StudySession, User
from app.progress.streak import compute_streak
from app.study.rules import goal_met, points_for_session, study_day, today_belem

router = APIRouter()

CLOCK_SLACK_SECONDS = 5
MAX_SESSION_HOURS = 16


class SessionIn(BaseModel):
    client_id: str = Field(min_length=1, max_length=64)
    topic: str = Field(min_length=1, max_length=120)
    part_id: int | None = None
    goal_minutes: int = Field(ge=1, le=600)
    started_at: datetime
    ended_at: datetime
    active_seconds: int = Field(ge=0)
    note: str | None = Field(default=None, max_length=500)


class SettingsIn(BaseModel):
    week_goal_days: int | None = Field(default=None, ge=1, le=7)
    in_ranking: bool | None = None


def _conclusion(s: StudySession) -> dict:
    return {
        "id": s.id,
        "points": s.points,
        "goal_met": s.goal_met,
        "streak_before": s.streak_before,
        "streak_after": s.streak_after,
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
        return _conclusion(dup)

    started, ended = to_naive_utc(body.started_at), to_naive_utc(body.ended_at)
    wall = (ended - started).total_seconds()
    if wall < 0 or wall > MAX_SESSION_HOURS * 3600:
        raise HTTPException(422, "Horários da sessão inválidos")
    if body.active_seconds > wall + CLOCK_SLACK_SECONDS:
        raise HTTPException(422, "Tempo estudado maior que a duração da sessão")
    if ended > utcnow() + timedelta(minutes=5):
        raise HTTPException(422, "A sessão termina no futuro")

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
        topic=body.topic.strip(),
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
        return _conclusion(_existing(db, user.id, body.client_id))
    return _conclusion(session)


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
