from sqlalchemy.orm import Session

from app.models import Event


def log_event(
    db: Session,
    kind: str,
    *,
    user_id: int | None = None,
    ok: bool = True,
    latency_ms: int | None = None,
    **data,
) -> None:
    """Registra um evento técnico (para o CSV do piloto). Quem chama faz o commit."""
    db.add(Event(user_id=user_id, kind=kind, ok=ok, latency_ms=latency_ms, data=data))
