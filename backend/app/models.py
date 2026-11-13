from datetime import date, datetime

from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    nickname: Mapped[str] = mapped_column(String(20))
    nickname_lower: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    pin_hash: Mapped[str] = mapped_column(String(200))
    week_goal_days: Mapped[int] = mapped_column(default=4)
    in_ranking: Mapped[bool] = mapped_column(default=False)
    failed_pins: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), default=None)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    ok: Mapped[bool] = mapped_column(default=True)
    latency_ms: Mapped[int | None] = mapped_column(default=None)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)


class StudySession(Base):
    __tablename__ = "study_sessions"
    __table_args__ = (UniqueConstraint("user_id", "client_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic: Mapped[str] = mapped_column(String(120))
    part_id: Mapped[int | None] = mapped_column(default=None, index=True)
    goal_minutes: Mapped[int]
    started_at: Mapped[datetime]
    ended_at: Mapped[datetime]
    active_seconds: Mapped[int]
    note: Mapped[str | None] = mapped_column(String(500), default=None)
    points: Mapped[int] = mapped_column(default=0)
    goal_met: Mapped[bool] = mapped_column(default=False)
    day: Mapped[date] = mapped_column(index=True)
    streak_before: Mapped[int] = mapped_column(default=0)
    streak_after: Mapped[int] = mapped_column(default=0)


class Trail(Base):
    __tablename__ = "trails"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    topic_norm: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    level: Mapped[str] = mapped_column(String(20), default="livre")
    status: Mapped[str] = mapped_column(String(12), default="generating", index=True)
    step: Mapped[str] = mapped_column(String(40), default="")
    error: Mapped[str | None] = mapped_column(String(20), default=None)
    is_catalog: Mapped[bool] = mapped_column(default=False)
    started_at: Mapped[datetime] = mapped_column(default=utcnow)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    trail_id: Mapped[int] = mapped_column(ForeignKey("trails.id"), index=True)
    order: Mapped[int]
    title: Mapped[str] = mapped_column(String(120))


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), index=True)
    position: Mapped[int] = mapped_column(default=0)
    youtube_id: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    channel: Mapped[str] = mapped_column(String(120))
    duration_s: Mapped[int] = mapped_column(default=0)
    analysis: Mapped[str] = mapped_column(String(10), default="pending")


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), index=True)
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id"), default=None)
    source: Mapped[str] = mapped_column(String(10), default="topic")
    question: Mapped[str] = mapped_column(String(1000))
    options: Mapped[list] = mapped_column(JSON)
    correct_index: Mapped[int]
    explanation: Mapped[str] = mapped_column(String(1000), default="")


class UserTrail(Base):
    __tablename__ = "user_trails"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    trail_id: Mapped[int] = mapped_column(ForeignKey("trails.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class PartDone(Base):
    __tablename__ = "parts_done"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), primary_key=True)
    done_at: Mapped[datetime] = mapped_column(default=utcnow)
