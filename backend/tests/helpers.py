import uuid
from datetime import UTC, datetime, timedelta


def session_body(
    *,
    active: int = 1500,
    goal: int = 25,
    topic: str = "Cálculo",
    end: datetime | None = None,
    client_id: str | None = None,
    part_id: int | None = None,
    note: str | None = None,
) -> dict:
    end = end or datetime(2026, 11, 10, 15, 0, tzinfo=UTC)
    return {
        "client_id": client_id or str(uuid.uuid4()),
        "topic": topic,
        "part_id": part_id,
        "goal_minutes": goal,
        "started_at": (end - timedelta(seconds=active)).isoformat(),
        "ended_at": end.isoformat(),
        "active_seconds": active,
        "note": note,
    }
