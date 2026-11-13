import hashlib
import hmac
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.models import AuthToken, User

router = APIRouter()

MAX_WRONG_PINS = 5
LOCK_MINUTES = 5
_ITERATIONS = 200_000


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt), _ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    salt, digest = stored.split("$")
    candidate = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt), _ITERATIONS)
    return hmac.compare_digest(candidate.hex(), digest)


class EnterIn(BaseModel):
    nickname: str = Field(pattern=r"^[A-Za-z0-9_]{3,20}$")
    pin: str = Field(pattern=r"^\d{4}$")


def current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Entre com seu apelido e PIN")
    token = db.get(AuthToken, authorization.removeprefix("Bearer "))
    if token is None:
        raise HTTPException(401, "Entre com seu apelido e PIN")
    return db.get(User, token.user_id)


@router.post("/auth/enter")
def enter(body: EnterIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.nickname_lower == body.nickname.lower()))
    if user is None:
        user = User(
            nickname=body.nickname,
            nickname_lower=body.nickname.lower(),
            pin_hash=hash_pin(body.pin),
        )
        db.add(user)
        db.flush()
        response.status_code = 201
    else:
        now = utcnow()
        if user.locked_until and user.locked_until > now:
            raise HTTPException(429, "Muitas tentativas, espere 5 minutos")
        if not verify_pin(body.pin, user.pin_hash):
            user.failed_pins += 1
            if user.failed_pins >= MAX_WRONG_PINS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_pins = 0
            db.commit()
            raise HTTPException(401, "PIN incorreto")
        user.failed_pins = 0
        user.locked_until = None

    token = AuthToken(token=secrets.token_urlsafe(32), user_id=user.id)
    db.add(token)
    db.commit()
    return {"token": token.token, "user": {"id": user.id, "nickname": user.nickname}}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {
        "id": user.id,
        "nickname": user.nickname,
        "week_goal_days": user.week_goal_days,
        "in_ranking": user.in_ranking,
    }
