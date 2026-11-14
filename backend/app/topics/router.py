"""Galeria de temas ("playlists"): criar na hora, sem IA; capas; níveis de luz."""
import base64
import binascii
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.models import PALETTES, Part, PartDone, StudySession, Topic, User
from app.progress.streak import compute_streak
from app.study.rules import today_belem
from app.topics.levels import level_for
from app.topics.service import get_or_create_topic
from app.trails.catalog import normalize

router = APIRouter()

MAX_COVER_CHARS = 100_000
_COVER = re.compile(r"^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")


def _clean_title(value: str) -> str:
    value = " ".join(value.split())
    if not 1 <= len(value) <= 80:
        raise ValueError("O tema precisa ter de 1 a 80 caracteres")
    return value


def _check_cover(value: str | None) -> str | None:
    if value is None:
        return None
    match = _COVER.match(value)
    if not match or len(value) > MAX_COVER_CHARS:
        raise ValueError("A capa precisa ser uma imagem pequena (JPEG, PNG ou WebP)")
    try:
        base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Imagem inválida") from exc
    return value


class TopicIn(BaseModel):
    title: str = Field(max_length=200)
    palette: Literal[PALETTES] | None = None  # type: ignore[valid-type]

    _title = field_validator("title")(lambda cls, v: _clean_title(v))


class TopicPatch(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    palette: Literal[PALETTES] | None = None  # type: ignore[valid-type]
    cover: str | None = None
    done: bool | None = None

    @field_validator("title")
    @classmethod
    def title_ok(cls, v):
        return None if v is None else _clean_title(v)

    @field_validator("cover")
    @classmethod
    def cover_ok(cls, v):
        return _check_cover(v)


def _stats(db: Session, user_id: int) -> dict[int, tuple[int, int, object, object]]:
    rows = db.execute(
        select(
            StudySession.topic_id,
            func.coalesce(func.sum(StudySession.active_seconds), 0),
            func.count(),
            func.max(StudySession.day),
            func.max(StudySession.ended_at),
        )
        .where(StudySession.user_id == user_id, StudySession.topic_id.is_not(None))
        .group_by(StudySession.topic_id)
    ).all()
    return {tid: (total, count, last_day, last_end) for tid, total, count, last_day, last_end in rows}


def _summary(topic: Topic, stats: tuple | None) -> dict:
    total, count, last_day, _ = stats or (0, 0, None, None)
    lv = level_for(total)
    return {
        "id": topic.id,
        "title": topic.title,
        "palette": topic.palette,
        "cover": topic.cover,
        "done": topic.done,
        "trail_id": topic.trail_id,
        "total_seconds": total,
        "sessions": count,
        "last_day": last_day.isoformat() if last_day else None,
        "level": {
            "name": lv.name,
            "next_name": lv.next_name,
            "progress": lv.progress,
            "seconds_to_next": lv.seconds_to_next,
        },
    }


def _own_topic(db: Session, user: User, topic_id: int) -> Topic:
    topic = db.get(Topic, topic_id)
    if topic is None or topic.user_id != user.id:
        raise HTTPException(404, "Tema não encontrado")
    return topic


@router.get("/topics")
def list_topics(
    sort: Literal["recent", "time", "done"] = "recent",
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    topics = db.scalars(select(Topic).where(Topic.user_id == user.id)).all()
    stats = _stats(db, user.id)
    items = [(t, stats.get(t.id)) for t in topics]
    if sort == "done":
        items = [i for i in items if i[0].done]
    if sort == "time":
        items.sort(key=lambda i: (i[1] or (0,))[0], reverse=True)
    else:
        items.sort(key=lambda i: max(filter(None, [(i[1] or (0, 0, None, None))[3], i[0].created_at])), reverse=True)
    return [_summary(t, s) for t, s in items]


@router.post("/topics", status_code=201)
def create_topic(body: TopicIn, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    existing = db.scalar(select(Topic).where(Topic.user_id == user.id, Topic.title_norm == normalize(body.title)[:80]))
    if existing:
        response.status_code = 200
        return _summary(existing, _stats(db, user.id).get(existing.id))
    topic = get_or_create_topic(db, user.id, body.title)
    if body.palette:
        topic.palette = body.palette
    db.commit()
    return _summary(topic, None)


@router.get("/topics/{topic_id}")
def get_topic(topic_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    topic = _own_topic(db, user, topic_id)
    sessions = db.scalars(
        select(StudySession)
        .where(StudySession.user_id == user.id, StudySession.topic_id == topic.id)
        .order_by(StudySession.ended_at.desc())
    ).all()
    detail = _summary(topic, _stats(db, user.id).get(topic.id))
    detail["streak"] = compute_streak({s.day for s in sessions}, today_belem()).streak
    detail["tracks"] = [
        {
            "id": s.id,
            "day": s.day.isoformat(),
            "active_seconds": s.active_seconds,
            "goal_minutes": s.goal_minutes,
            "goal_met": s.goal_met,
            "points": s.points,
            "note": s.note,
        }
        for s in sessions[:50]
    ]
    detail["trail"] = None
    if topic.trail_id:
        parts = db.scalars(select(Part).where(Part.trail_id == topic.trail_id).order_by(Part.order)).all()
        done = set(db.scalars(select(PartDone.part_id).where(PartDone.user_id == user.id)))
        pending = [p.order for p in parts if p.id not in done]
        detail["trail"] = {
            "id": topic.trail_id,
            "parts_done": len(parts) - len(pending),
            "parts_total": len(parts),
            "next_part": pending[0] if pending else None,
        }
    return detail


@router.patch("/topics/{topic_id}")
def update_topic(topic_id: int, body: TopicPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    topic = _own_topic(db, user, topic_id)
    sent = body.model_fields_set
    if body.title is not None:
        norm = normalize(body.title)[:80]
        clash = db.scalar(select(Topic.id).where(Topic.user_id == user.id, Topic.title_norm == norm, Topic.id != topic.id))
        if clash:
            raise HTTPException(409, "Você já tem um tema com esse nome")
        topic.title, topic.title_norm = body.title, norm
    if body.palette is not None:
        topic.palette = body.palette
    if "cover" in sent:
        topic.cover = body.cover
    if body.done is not None:
        topic.done = body.done
    db.commit()
    return _summary(topic, _stats(db, user.id).get(topic.id))


@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(topic_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    topic = _own_topic(db, user, topic_id)
    # as sessões continuam valendo (ofensiva, pontos); só deixam de pertencer ao tema
    db.execute(update(StudySession).where(StudySession.topic_id == topic.id).values(topic_id=None))
    db.delete(topic)
    db.commit()
