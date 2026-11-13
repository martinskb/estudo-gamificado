from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.models import StudySession, User
from app.progress.streak import compute_streak, week_days_count, week_start
from app.study.rules import today_belem

router = APIRouter()


def studied_days(db: Session, user_id: int) -> set[date]:
    return set(
        db.scalars(select(StudySession.day).where(StudySession.user_id == user_id).distinct())
    )


def user_trails(db: Session, user_id: int) -> list[dict]:
    return []


@router.get("/progress")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_belem()
    days = studied_days(db, user.id)
    state = compute_streak(days, today)

    mine = StudySession.user_id == user.id
    total_points = db.scalar(select(func.coalesce(func.sum(StudySession.points), 0)).where(mine))
    week_points = db.scalar(
        select(func.coalesce(func.sum(StudySession.points), 0)).where(
            mine, StudySession.day >= week_start(today)
        )
    )
    by_topic = db.execute(
        select(StudySession.topic, func.sum(StudySession.active_seconds))
        .where(mine)
        .group_by(StudySession.topic)
        .order_by(func.sum(StudySession.active_seconds).desc())
    )
    year_ago = today - timedelta(days=365)
    return {
        "streak": state.streak,
        "freezes": state.freezes,
        "studied_today": state.studied_today,
        "saved_days": [d.isoformat() for d in state.saved_days if d >= year_ago],
        "studied_days": sorted(d.isoformat() for d in days if d >= year_ago),
        "week_days": week_days_count(days, today),
        "week_goal_days": user.week_goal_days,
        "total_points": total_points,
        "week_points": week_points,
        "minutes_by_topic": [
            {"topic": topic, "minutes": seconds // 60} for topic, seconds in by_topic
        ],
        "trails": user_trails(db, user.id),
    }
