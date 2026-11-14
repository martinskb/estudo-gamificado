"""Perfil: trocar apelido e números gerais da pessoa."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.models import StudySession, Topic, User
from app.topics.levels import LEVELS, level_for

router = APIRouter()


class ProfileIn(BaseModel):
    nickname: str = Field(pattern=r"^[A-Za-z0-9_]{3,20}$")


def longest_run(days: list) -> int:
    best = run = 0
    previous = None
    for day in sorted(set(days)):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return best


@router.patch("/me")
def update_profile(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lower = body.nickname.lower()
    taken = db.scalar(select(User.id).where(User.nickname_lower == lower, User.id != user.id))
    if taken:
        raise HTTPException(409, "Esse apelido já está em uso")
    user.nickname, user.nickname_lower = body.nickname, lower
    db.commit()
    return {"id": user.id, "nickname": user.nickname, "week_goal_days": user.week_goal_days, "in_ranking": user.in_ranking}


@router.get("/me/stats")
def stats(user: User = Depends(current_user), db: Session = Depends(get_db)):
    mine = StudySession.user_id == user.id
    total, sessions = db.execute(
        select(func.coalesce(func.sum(StudySession.active_seconds), 0), func.count()).where(mine)
    ).one()
    days = list(db.scalars(select(StudySession.day).where(mine).distinct()))
    per_topic = db.execute(
        select(Topic.title, func.coalesce(func.sum(StudySession.active_seconds), 0))
        .join(StudySession, StudySession.topic_id == Topic.id)
        .where(Topic.user_id == user.id)
        .group_by(Topic.id, Topic.title)
        .order_by(func.sum(StudySession.active_seconds).desc())
    ).all()
    order = {name: i for i, (name, _) in enumerate(LEVELS)}
    best = None
    if per_topic and per_topic[0][1] > 0:
        title, seconds = per_topic[0]  # o tema com mais tempo tem o nível mais alto
        name = level_for(seconds).name
        best = {"name": name, "topic": title} if order[name] > 0 else None
    topics = db.scalar(select(func.count()).select_from(Topic).where(Topic.user_id == user.id))
    return {
        "total_seconds": total,
        "sessions": sessions,
        "topics": topics,
        "longest_streak": longest_run(days),
        "best_level": best,
        "member_since": user.created_at.date().isoformat(),
    }
