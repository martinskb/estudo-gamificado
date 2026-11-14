"""Dá à conta da demonstração um histórico de estudo, para o calendário, a ofensiva e a
trilha não aparecerem vazios na apresentação.

Uso (a conta precisa existir: entre uma vez no site com o apelido):
    uv run python -m scripts.seed_demo_account Beater 2026-11-16 "Leis de Newton" "Funções do 1º grau"

O histórico vai até a véspera da demo, com 1 dia salvo pela proteção; o dia da demo fica
livre para estudar ao vivo. Pode rodar de novo: nada é duplicado.
Só é usado para a conta da apresentação — não mexe em nenhuma outra.
"""
import sys
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.models import Part, PartDone, StudySession, Trail, User, UserTrail
from app.study.rules import BELEM, goal_met, points_for_session

# Dias antes da demo com estudo: 7 seguidos (ganha 1 proteção), 1 sem estudo (salvo pela
# proteção) e mais 6 seguidos até a véspera → ofensiva de 13 dias na manhã da demo.
STUDY_DAYS_BEFORE = [14, 13, 12, 11, 10, 9, 8, 6, 5, 4, 3, 2, 1]
PARTS_DONE = 2
OTHER_TOPICS = ["Redação ENEM", "Inglês"]


def seed_demo_account(
    nickname: str, demo_day: date, trail_ids: list[int], session_factory: sessionmaker
) -> None:
    with session_factory() as db:
        user = db.scalar(select(User).where(User.nickname_lower == nickname.lower()))
        if user is None:
            raise LookupError(f"Conta '{nickname}' não existe: entre uma vez no site com esse apelido.")
        user.in_ranking = True

        trails = [db.get(Trail, i) for i in trail_ids]
        trails = [t for t in trails if t is not None and t.status == "ready"]
        parts_by_trail = {
            t.id: db.scalars(select(Part).where(Part.trail_id == t.id).order_by(Part.order)).all()
            for t in trails
        }
        # O Início continua a trilha mais recente: a primeira da lista fica por último no tempo.
        now = datetime.now(UTC).replace(tzinfo=None)
        for position, t in enumerate(trails):
            enrolled = db.get(UserTrail, (user.id, t.id))
            if enrolled is None:
                enrolled = UserTrail(user_id=user.id, trail_id=t.id)
                db.add(enrolled)
            enrolled.created_at = now - timedelta(seconds=position)

        main = trails[0] if trails else None
        main_parts = parts_by_trail.get(main.id, [])[:PARTS_DONE] if main else []

        for k, back in enumerate(STUDY_DAYS_BEFORE):
            day = demo_day - timedelta(days=back)
            sessions_today = 2 if back % 3 == 0 else 1
            scored = 0
            for n in range(sessions_today):
                client_id = f"demo-{user.id}-{day.isoformat()}-{n}"
                exists = db.scalar(
                    select(StudySession.id).where(
                        StudySession.user_id == user.id, StudySession.client_id == client_id
                    )
                )
                if exists:
                    continue
                if main and n == 0:
                    part = main_parts[min(k * len(main_parts) // len(STUDY_DAYS_BEFORE), len(main_parts) - 1)] if main_parts else None
                    topic, part_id = main.title, part.id if part else None
                else:
                    topic, part_id = OTHER_TOPICS[(k + n) % len(OTHER_TOPICS)], None
                if n == 1 and len(trails) > 1:
                    second = parts_by_trail[trails[1].id]
                    topic, part_id = trails[1].title, second[0].id if second else None
                active = [1500, 1800, 1320, 2100, 960][(k + n) % 5]
                local_end = datetime.combine(day, time(19 + n, 10 + (k * 7) % 40), tzinfo=BELEM)
                ended = local_end.astimezone(UTC).replace(tzinfo=None)
                points = points_for_session(active, scored)
                scored += points > 0
                db.add(
                    StudySession(
                        client_id=client_id,
                        user_id=user.id,
                        topic=topic,
                        part_id=part_id,
                        goal_minutes=25,
                        started_at=ended - timedelta(seconds=active),
                        ended_at=ended,
                        active_seconds=active,
                        note="Revisei os exemplos da aula." if k % 4 == 0 else None,
                        points=points,
                        goal_met=goal_met(active, 25),
                        day=day,
                    )
                )

        for part in main_parts:
            if db.get(PartDone, (user.id, part.id)) is None:
                db.add(PartDone(user_id=user.id, part_id=part.id))
        db.commit()


if __name__ == "__main__":
    from app import models  # noqa: F401
    from app.db import SessionLocal
    from app.trails.catalog import normalize

    nickname, demo, *titles = sys.argv[1:]
    with SessionLocal() as db:
        ids = [
            db.scalar(select(Trail.id).where(Trail.topic_norm == normalize(title))) for title in titles
        ]
    missing = [t for t, i in zip(titles, ids) if i is None]
    if missing:
        sys.exit(f"Trilhas não encontradas: {missing}")
    seed_demo_account(nickname, date.fromisoformat(demo), ids, SessionLocal)
    print(f"Histórico criado para {nickname} até a véspera de {demo}.")
