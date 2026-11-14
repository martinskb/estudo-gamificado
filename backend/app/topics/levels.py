"""Níveis do disco de um tema (vinil → diamante), pelas horas focadas nele."""
from dataclasses import dataclass

LEVELS = [("Vinil", 0), ("Prata", 1), ("Ouro", 5), ("Platina", 15), ("Diamante", 40)]


@dataclass
class Level:
    name: str
    next_name: str | None
    progress: float  # 0 a 1, até o próximo nível
    seconds_to_next: int


def level_for(total_seconds: int) -> Level:
    hours = total_seconds / 3600
    index = max(i for i, (_, h) in enumerate(LEVELS) if hours >= h)
    name, start = LEVELS[index]
    if index == len(LEVELS) - 1:
        return Level(name, None, 1.0, 0)
    next_name, end = LEVELS[index + 1]
    progress = round((hours - start) / (end - start), 4)
    return Level(name, next_name, progress, max(0, round(end * 3600 - total_seconds)))
