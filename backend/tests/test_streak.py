from datetime import date, timedelta

from app.progress.streak import compute_streak, week_days_count

D = date(2026, 11, 12)  # quinta-feira


def days(*offsets: int) -> set[date]:
    """Dias relativos a D: 0 = hoje, -1 = ontem."""
    return {D + timedelta(days=o) for o in offsets}


def run(first: int, last: int) -> set[date]:
    return days(*range(first, last + 1))


def test_no_study_no_streak():
    s = compute_streak(set(), D)
    assert (s.streak, s.freezes, s.saved_days, s.studied_today) == (0, 0, [], False)


def test_streak_survives_until_today_is_over():
    s = compute_streak(run(-3, -1), D)
    assert s.streak == 3
    assert s.studied_today is False


def test_today_extends_streak():
    s = compute_streak(run(-3, 0), D)
    assert s.streak == 4
    assert s.studied_today is True


def test_missed_day_without_freeze_resets():
    # dias 1-3 e 5, sem o 4
    s = compute_streak(days(-4, -3, -2, 0), D)
    assert s.streak == 1
    assert s.saved_days == []


def test_freeze_earned_at_7_saves_a_missed_day():
    # 7 seguidos, falta o 8º, estuda no 9º (hoje)
    s = compute_streak(run(-8, -2) | days(0), D)
    assert s.streak == 8
    assert s.freezes == 0
    assert s.saved_days == [D - timedelta(days=1)]


def test_freezes_capped_at_2():
    assert compute_streak(run(-20, 0), D).freezes == 2


def test_two_freezes_cover_two_missed_days_then_reset():
    studied = run(-20, -4)  # 17 dias seguidos → 2 proteções; faltam -3, -2, -1
    s = compute_streak(studied, D)
    assert s.streak == 0
    assert s.freezes == 0


def test_week_days_count_monday_to_today():
    # D é quinta: segunda = -3, quarta = -1, domingo anterior = -4
    assert week_days_count(days(-3, -1, -4), D) == 2
