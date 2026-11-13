"""Assistente de dúvidas, sob demanda. Só o texto da pergunta e o tema vão para a IA."""
import time
from datetime import UTC, datetime, time as clock

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.client import AIClient
from app.ai.deps import get_ai
from app.auth import current_user
from app.db import get_db
from app.events import log_event
from app.models import Event, User
from app.study.rules import BELEM, today_belem

router = APIRouter()

DAILY_LIMIT = 20


class QuestionIn(BaseModel):
    question: str = Field(max_length=1000)
    topic: str | None = Field(default=None, max_length=120)

    @field_validator("question")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Escreva sua dúvida")
        return value


def asked_today(db: Session, user_id: int) -> int:
    day_start = datetime.combine(today_belem(), clock.min, tzinfo=BELEM)
    day_start_utc = day_start.astimezone(UTC).replace(tzinfo=None)
    return db.scalar(
        select(func.count())
        .select_from(Event)
        .where(
            Event.kind == "assistant",
            Event.user_id == user_id,
            Event.ok,
            Event.created_at >= day_start_utc,
        )
    )


@router.post("/assistant")
def ask(
    body: QuestionIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    ai: AIClient = Depends(get_ai),
):
    used = asked_today(db, user.id)
    if used >= DAILY_LIMIT:
        raise HTTPException(429, f"Você já fez {DAILY_LIMIT} perguntas hoje. Amanhã tem mais.")

    start = time.monotonic()
    try:
        answer = ai.answer(body.question, body.topic)
    except Exception:
        log_event(db, "assistant", user_id=user.id, ok=False, latency_ms=_ms(start))
        db.commit()
        raise HTTPException(503, "Assistente indisponível, tente de novo") from None
    # Guardamos só que houve uso e quanto demorou, nunca o texto da pergunta.
    log_event(db, "assistant", user_id=user.id, ok=True, latency_ms=_ms(start))
    db.commit()
    return {"answer": answer, "remaining": DAILY_LIMIT - used - 1}


def _ms(start: float) -> int:
    return int((time.monotonic() - start) * 1000)
