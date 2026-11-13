import pytest
from sqlalchemy import select

from app.models import Event, Exercise, Part, Trail, Video
from app.trails.generate import analyze_videos, generate_trail
from tests.fakes import FakeAI, FakeVideos


@pytest.fixture
def ai():
    return FakeAI()


@pytest.fixture
def yt():
    return FakeVideos()


@pytest.fixture
def trail_id(session_factory):
    with session_factory() as db:
        trail = Trail(title="Funções do 1º grau", topic_norm="funcoes do 1o grau", level="vestibular")
        db.add(trail)
        db.commit()
        return trail.id


def load(session_factory, trail_id):
    with session_factory() as db:
        trail = db.get(Trail, trail_id)
        parts = db.scalars(select(Part).where(Part.trail_id == trail_id).order_by(Part.order)).all()
        ids = [p.id for p in parts]
        videos = db.scalars(select(Video).where(Video.part_id.in_(ids))).all()
        exercises = db.scalars(select(Exercise).where(Exercise.part_id.in_(ids))).all()
        return trail, parts, videos, exercises


def test_happy_path_ready(session_factory, trail_id, ai, yt):
    generate_trail(trail_id, ai, yt, session_factory)
    trail, parts, videos, exercises = load(session_factory, trail_id)
    assert trail.status == "ready" and trail.error is None
    assert [p.title for p in parts] == ["Parte A", "Parte B", "Parte C", "Parte D"]
    assert [p.order for p in parts] == [1, 2, 3, 4]
    assert len(videos) == 12
    assert len(exercises) == 16
    assert all(e.source == "topic" and len(e.options) == 4 for e in exercises)


def test_search_query_includes_topic_and_part(session_factory, trail_id, ai, yt):
    generate_trail(trail_id, ai, yt, session_factory)
    assert "Funções do 1º grau" in yt.queries[0] and "Parte A" in yt.queries[0]


def test_malformed_ai_json_retries_once(session_factory, trail_id, ai, yt):
    ai.split_failures = 1
    generate_trail(trail_id, ai, yt, session_factory)
    assert load(session_factory, trail_id)[0].status == "ready"


def test_malformed_ai_json_retries_then_fails(session_factory, trail_id, ai, yt):
    ai.split_failures = 2
    generate_trail(trail_id, ai, yt, session_factory)
    trail = load(session_factory, trail_id)[0]
    assert trail.status == "failed"
    assert trail.error == "ai"


def test_part_without_videos_still_ready(session_factory, trail_id, ai, yt):
    yt.empty_for = {"Parte B"}
    generate_trail(trail_id, ai, yt, session_factory)
    trail, parts, videos, _ = load(session_factory, trail_id)
    assert trail.status == "ready"
    part_b = next(p for p in parts if p.title == "Parte B")
    assert [v for v in videos if v.part_id == part_b.id] == []
    assert len(videos) == 9


def test_quota_marks_failed(session_factory, trail_id, ai, yt):
    yt.quota = True
    generate_trail(trail_id, ai, yt, session_factory)
    trail = load(session_factory, trail_id)[0]
    assert (trail.status, trail.error) == ("failed", "quota")


def test_generation_logs_events_with_latency(session_factory, trail_id, ai, yt):
    generate_trail(trail_id, ai, yt, session_factory)
    with session_factory() as db:
        events = db.scalars(select(Event).where(Event.kind.like("trail_%"))).all()
    assert {e.kind for e in events} >= {"trail_split", "trail_videos", "trail_quiz"}
    assert all(e.latency_ms is not None for e in events)


def test_video_analysis_adds_video_exercises_for_first_video_of_each_part(
    session_factory, trail_id, ai, yt
):
    generate_trail(trail_id, ai, yt, session_factory)
    analyze_videos(trail_id, ai, session_factory)
    _, parts, videos, exercises = load(session_factory, trail_id)
    assert sum(v.analysis == "done" for v in videos) == len(parts)
    from_video = [e for e in exercises if e.source == "video"]
    assert len(from_video) == 4 * len(parts)
    assert all(e.video_id is not None for e in from_video)
    url = next(c for c in ai.calls if c[0] == "video_quiz")[1]
    assert url.startswith("https://www.youtube.com/watch?v=vid")


def test_video_analysis_failure_keeps_topic_exercises(session_factory, trail_id, ai, yt):
    generate_trail(trail_id, ai, yt, session_factory)
    ai.video_quiz_fails = True
    analyze_videos(trail_id, ai, session_factory)
    _, parts, videos, exercises = load(session_factory, trail_id)
    assert sum(v.analysis == "failed" for v in videos) == len(parts)
    assert len(exercises) == 16 and all(e.source == "topic" for e in exercises)


def test_stale_generating_trails_are_failed_on_startup(session_factory):
    from datetime import timedelta

    from app.db import utcnow
    from app.trails.generate import fail_stale_generating

    with session_factory() as db:
        db.add(Trail(title="Velha", topic_norm="velha", started_at=utcnow() - timedelta(minutes=11)))
        db.add(Trail(title="Nova", topic_norm="nova", started_at=utcnow() - timedelta(minutes=2)))
        db.commit()
        assert fail_stale_generating(db) == 1
        status = dict(db.execute(select(Trail.title, Trail.status)).all())
    assert status == {"Velha": "failed", "Nova": "generating"}
