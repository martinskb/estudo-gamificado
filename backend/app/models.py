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
