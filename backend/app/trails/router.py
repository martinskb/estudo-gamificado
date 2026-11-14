from datetime import UTC, datetime, time
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.ai.client import AIClient
from app.ai.deps import get_ai, get_videos
from app.ai.youtube import VideoSearch
from app.auth import current_user
from app.db import get_db, get_session_factory, utcnow
from app.models import Part, PartDone, StudySession, Trail, User, UserTrail, Video
from app.study.rules import BELEM, today_belem
from app.trails.catalog import match, normalize
from app.trails.generate import STALE_AFTER, analyze_videos, generate_trail

router = APIRouter()

# Cada trilha nova gasta ~5% da cota diária grátis do YouTube: limite por pessoa.
NEW_TRAILS_PER_DAY = 2


class TrailIn(BaseModel):
    topic: str = Field(max_length=120)
    level: Literal["vestibular", "superior", "livre"] = "livre"

    @field_validator("topic")
    @classmethod
    def clean_topic(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 3:
            raise ValueError("Escreva o tema com pelo menos 3 letras")
        return value


def enroll(db: Session, user_id: int, trail_id: int) -> None:
    if db.get(UserTrail, (user_id, trail_id)) is None:
        db.add(UserTrail(user_id=user_id, trail_id=trail_id))
        db.commit()


def user_trails(db: Session, user_id: int) -> list[dict]:
    total = (
        select(func.count()).select_from(Part).where(Part.trail_id == Trail.id).scalar_subquery()
    )
    done = (
        select(func.count())
        .select_from(PartDone)
        .join(Part, Part.id == PartDone.part_id)
        .where(Part.trail_id == Trail.id, PartDone.user_id == user_id)
        .scalar_subquery()
    )
    rows = db.execute(
        select(Trail.id, Trail.title, done, total)
        .join(UserTrail, UserTrail.trail_id == Trail.id)
        .where(UserTrail.user_id == user_id, Trail.status != "failed")
        .order_by(UserTrail.created_at.desc())
    )
    return [
        {"trail_id": i, "title": title, "parts_done": d, "parts_total": t}
        for i, title, d, t in rows
    ]


def new_trails_today(db: Session, user_id: int) -> int:
    day_start = datetime.combine(today_belem(), time.min, tzinfo=BELEM)
    return db.scalar(
        select(func.count())
        .select_from(Trail)
        .where(
            Trail.created_by == user_id,
            Trail.status != "failed",
            Trail.created_at >= day_start.astimezone(UTC).replace(tzinfo=None),
        )
    )


def run_generation(trail_id: int, ai: AIClient, yt: VideoSearch, factory: sessionmaker) -> None:
    generate_trail(trail_id, ai, yt, factory)
    with factory() as db:
        ready = db.get(Trail, trail_id).status == "ready"
    if ready:
        analyze_videos(trail_id, ai, factory)


@router.get("/catalog")
def catalog(q: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    ready = select(Trail.id, Trail.title).where(Trail.status == "ready")
    if not q.strip():
        rows = db.execute(ready.where(Trail.is_catalog).order_by(Trail.title).limit(20)).all()
        return [{"trail_id": i, "title": t} for i, t in rows]
    titles = dict(db.execute(ready).all())
    return [{"trail_id": i, "title": titles[i]} for i in match(q, titles)]


@router.post("/trails")
def create_trail(
    body: TrailIn,
    background: BackgroundTasks,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    ai: AIClient = Depends(get_ai),
    yt: VideoSearch = Depends(get_videos),
    factory: sessionmaker = Depends(get_session_factory),
):
    norm = normalize(body.topic)
    by_norm = select(Trail).where(Trail.topic_norm == norm)
    trail = db.scalar(by_norm)
    if trail is None:
        if new_trails_today(db, user.id) >= NEW_TRAILS_PER_DAY:
            raise HTTPException(
                429,
                f"Você já criou {NEW_TRAILS_PER_DAY} trilhas novas hoje. "
                "Escolha uma trilha pronta ou volte amanhã.",
            )
        trail = Trail(title=body.topic, topic_norm=norm, level=body.level, created_by=user.id)
        db.add(trail)
        try:
            db.commit()
        except IntegrityError:  # outra pessoa pediu o mesmo tema ao mesmo tempo
            db.rollback()
            trail = db.scalar(by_norm)
            enroll(db, user.id, trail.id)
            return {"trail_id": trail.id, "status": trail.status}
    else:
        stale = trail.status == "generating" and trail.started_at < utcnow() - STALE_AFTER
        enroll(db, user.id, trail.id)
        if trail.status != "failed" and not stale:
            return {"trail_id": trail.id, "status": trail.status}
        trail.status, trail.step, trail.error, trail.started_at = "generating", "", None, utcnow()
        db.commit()

    enroll(db, user.id, trail.id)
    background.add_task(run_generation, trail.id, ai, yt, factory)
    return {"trail_id": trail.id, "status": "generating"}


def trail_detail(db: Session, trail: Trail, user_id: int) -> dict:
    parts = db.scalars(select(Part).where(Part.trail_id == trail.id).order_by(Part.order)).all()
    videos = db.scalars(
        select(Video)
        .where(Video.part_id.in_([p.id for p in parts]))
        .order_by(Video.position, Video.id)
    ).all()
    done = set(
        db.scalars(
            select(PartDone.part_id).where(
                PartDone.user_id == user_id, PartDone.part_id.in_([p.id for p in parts])
            )
        )
    )
    return {
        "id": trail.id,
        "title": trail.title,
        "status": trail.status,
        "step": trail.step,
        "error": trail.error,
        "parts": [
            {
                "id": p.id,
                "order": p.order,
                "title": p.title,
                "done": p.id in done,
                "videos": [
                    {
                        "youtube_id": v.youtube_id,
                        "title": v.title,
                        "channel": v.channel,
                        "duration_s": v.duration_s,
                    }
                    for v in videos
                    if v.part_id == p.id
                ],
            }
            for p in parts
        ],
    }


@router.get("/trails/{trail_id}")
def get_trail(trail_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trail = db.get(Trail, trail_id)
    if trail is None:
        raise HTTPException(404, "Trilha não encontrada")
    return trail_detail(db, trail, user.id)


@router.post("/trails/{trail_id}/start")
def start_trail(trail_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Trail, trail_id) is None:
        raise HTTPException(404, "Trilha não encontrada")
    enroll(db, user.id, trail_id)
    return {"ok": True}


@router.get("/me/trails")
def my_trails(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return user_trails(db, user.id)


@router.post("/parts/{part_id}/done")
def mark_part_done(part_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    part = db.get(Part, part_id)
    if part is None:
        raise HTTPException(404, "Parte não encontrada")
    studied = db.scalar(
        select(func.count())
        .select_from(StudySession)
        .where(StudySession.user_id == user.id, StudySession.part_id == part_id)
    )
    if not studied:
        raise HTTPException(409, "Estude ao menos uma sessão nesta parte")
    if db.get(PartDone, (user.id, part_id)) is None:
        db.add(PartDone(user_id=user.id, part_id=part_id))
        enroll(db, user.id, part.trail_id)
        db.commit()
    return {"ok": True}
