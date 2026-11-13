"""Ranking semanal opcional, por apelido. Só aparece quem escolheu participar."""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.models import StudySession, User
from app.progress.streak import compute_streak, week_start
from app.study.rules import today_belem

router = APIRouter()

TOP = 20


@router.get("/ranking")
def ranking(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_belem()
    week_points = func.coalesce(func.sum(StudySession.points), 0)
    rows = db.execute(
        select(User.id, User.nickname, week_points)
        .outerjoin(
            StudySession,
            (StudySession.user_id == User.id) & (StudySession.day >= week_start(today)),
        )
        .where(User.in_ranking)
        .group_by(User.id, User.nickname)
        .order_by(week_points.desc(), User.nickname_lower)
    ).all()

    top = rows[:TOP]
    days_by_user: dict[int, set] = defaultdict(set)
    if top:
        for user_id, day in db.execute(
            select(StudySession.user_id, StudySession.day)
            .where(StudySession.user_id.in_([r[0] for r in top]))
            .distinct()
        ):
            days_by_user[user_id].add(day)

    me = next(
        ({"position": i, "week_points": points} for i, (uid, _, points) in enumerate(rows, 1) if uid == user.id),
        None,
    )
    return {
        "top": [
            {
                "nickname": nickname,
                "week_points": points,
                "streak": compute_streak(days_by_user[uid], today).streak,
            }
            for uid, nickname, points in top
        ],
        "me": me,
    }
