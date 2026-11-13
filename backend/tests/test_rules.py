from datetime import UTC, date, datetime

from app.study.rules import goal_met, points_for_session, study_day


def test_points_need_20_minutes():
    assert points_for_session(1200, 0) == 10
    assert points_for_session(1199, 0) == 0


def test_points_capped_at_3_sessions_a_day():
    assert points_for_session(3600, 2) == 10
    assert points_for_session(3600, 3) == 0


def test_goal_met_when_active_time_reaches_goal():
    assert goal_met(1500, 25) is True
    assert goal_met(1499, 25) is False


def test_study_day_uses_belem_end_date():
    assert study_day(datetime(2026, 11, 15, 3, 10, tzinfo=UTC)) == date(2026, 11, 15)
    assert study_day(datetime(2026, 11, 15, 2, 50, tzinfo=UTC)) == date(2026, 11, 14)


def test_study_day_treats_naive_as_utc():
    assert study_day(datetime(2026, 11, 15, 2, 50)) == date(2026, 11, 14)
