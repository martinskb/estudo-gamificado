"""Ofensiva (dias seguidos) com proteção. Funções puras."""
from dataclasses import dataclass, field
from datetime import date, timedelta

FREEZE_EVERY_DAYS = 7
MAX_FREEZES = 2


@dataclass
class StreakState:
    streak: int = 0
    freezes: int = 0
    saved_days: list[date] = field(default_factory=list)
    studied_today: bool = False


def compute_streak(studied: set[date], today: date) -> StreakState:
    state = StreakState(studied_today=today in studied)
    past = [d for d in studied if d <= today]
    if not past:
        return state

    def extend() -> None:
        state.streak += 1
        if state.streak % FREEZE_EVERY_DAYS == 0:
            state.freezes = min(MAX_FREEZES, state.freezes + 1)

    day = min(past)
    while day < today:
        if day in studied:
            extend()
        elif state.freezes > 0 and state.streak > 0:
            state.freezes -= 1
            state.saved_days.append(day)
        else:
            state.streak = 0
        day += timedelta(days=1)

    # Hoje só soma; um dia que ainda não acabou nunca quebra a ofensiva.
    if state.studied_today:
        extend()
    return state


def week_start(today: date) -> date:
    return today - timedelta(days=today.weekday())


def week_days_count(studied: set[date], today: date) -> int:
    start = week_start(today)
    return sum(1 for d in studied if start <= d <= today)
