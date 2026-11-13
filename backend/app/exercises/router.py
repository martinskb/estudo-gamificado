"""Exercícios de fixação. Opcionais e sem nota: acertar NÃO dá pontos."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.db import get_db
from app.events import log_event
from app.models import Attempt, Exercise, Part, User

router = APIRouter()


class AnswerIn(BaseModel):
    choice: int = Field(ge=0, le=3)


@router.get("/parts/{part_id}/quiz")
def quiz(
    part_id: int,
    n: int = Query(default=4, ge=1, le=10),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if db.get(Part, part_id) is None:
        raise HTTPException(404, "Parte não encontrada")
    # As questões feitas a partir do vídeo vêm primeiro; as do assunto completam.
    video_first = case((Exercise.source == "video", 0), else_=1)
    rows = db.scalars(
        select(Exercise).where(Exercise.part_id == part_id).order_by(video_first, Exercise.id).limit(n)
    )
    return [
        {"id": e.id, "question": e.question, "options": e.options, "source": e.source} for e in rows
    ]


@router.post("/exercises/{exercise_id}/answer")
def answer(
    exercise_id: int,
    body: AnswerIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(404, "Questão não encontrada")
    correct = body.choice == exercise.correct_index
    db.add(Attempt(user_id=user.id, exercise_id=exercise_id, choice=body.choice, correct=correct))
    log_event(db, "quiz_answer", user_id=user.id, exercise_id=exercise_id, correct=correct)
    db.commit()
    return {
        "correct": correct,
        "correct_index": exercise.correct_index,
        "explanation": exercise.explanation,
    }
