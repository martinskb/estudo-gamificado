"""Gera os temas populares do catálogo (trilha, vídeos, análise dos vídeos, exercícios).

Uso (com as chaves no .env):  uv run python -m scripts.seed_catalog
Pode rodar de novo: temas já prontos são pulados.
"""
import time
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.ai.client import AIClient
from app.ai.youtube import VideoSearch
from app.db import utcnow
from app.models import Part, Trail, Video
from app.trails.catalog import normalize
from app.trails.generate import analyze_videos, generate_trail

TOPICS_FILE = Path(__file__).with_name("catalog_topics.txt")
LEVELS = {"vestibular", "superior", "livre"}


def parse_topics(text: str) -> list[tuple[str, str]]:
    topics = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "|" not in line:
            continue
        level, topic = (piece.strip() for piece in line.split("|", 1))
        if topic:
            topics.append((level if level in LEVELS else "livre", topic))
    return topics


def seed(
    topics: list[tuple[str, str]],
    ai: AIClient,
    yt: VideoSearch,
    session_factory: sessionmaker,
    pause_s: float = 5,
) -> None:
    for level, topic in topics:
        norm = normalize(topic)
        with session_factory() as db:
            trail = db.scalar(select(Trail).where(Trail.topic_norm == norm))
            if trail is None:
                trail = Trail(title=topic, topic_norm=norm, level=level)
                db.add(trail)
            already_ready = trail.status == "ready"
            trail.is_catalog = True
            if not already_ready:
                trail.status, trail.step, trail.error, trail.started_at = "generating", "", None, utcnow()
            db.commit()
            trail_id = trail.id

        if not already_ready:
            generate_trail(trail_id, ai, yt, session_factory)
            analyze_videos(trail_id, ai, session_factory)
            time.sleep(pause_s)  # respeita o limite por minuto do plano grátis

        with session_factory() as db:
            trail = db.get(Trail, trail_id)
            analysed = db.scalar(
                select(func.count())
                .select_from(Video)
                .join(Part, Part.id == Video.part_id)
                .where(Part.trail_id == trail_id, Video.analysis == "done")
            )
            note = "já estava pronto" if already_ready else (trail.error or "")
            print(f"{topic}: {trail.status} ({analysed} vídeos analisados) {note}".rstrip())


if __name__ == "__main__":
    from app import models  # noqa: F401
    from app.ai.deps import get_ai, get_videos
    from app.db import Base, SessionLocal, engine

    Base.metadata.create_all(engine)
    seed(parse_topics(TOPICS_FILE.read_text(encoding="utf-8")), get_ai(), get_videos(), SessionLocal)
