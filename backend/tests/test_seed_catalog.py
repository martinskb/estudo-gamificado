from sqlalchemy import select

from app.models import Trail, Video
from scripts.seed_catalog import parse_topics, seed
from tests.fakes import FakeAI, FakeVideos


def test_parse_topics_skips_blank_and_comment_lines():
    text = "vestibular|Leis de Newton\n\n# comentário\nlivre| Excel básico \n"
    assert parse_topics(text) == [("vestibular", "Leis de Newton"), ("livre", "Excel básico")]


def test_seed_creates_ready_catalog_trails_and_is_rerunnable(session_factory):
    ai, yt = FakeAI(), FakeVideos()
    topics = [("vestibular", "Leis de Newton"), ("livre", "Excel básico")]
    seed(topics, ai, yt, session_factory, pause_s=0)
    seed(topics, ai, yt, session_factory, pause_s=0)  # segunda rodada não refaz nada
    with session_factory() as db:
        trails = db.scalars(select(Trail)).all()
        analysed = db.scalars(select(Video).where(Video.analysis == "done")).all()
    assert sorted(t.title for t in trails) == ["Excel básico", "Leis de Newton"]
    assert all(t.is_catalog and t.status == "ready" for t in trails)
    assert len(analysed) == 8
    assert sum(c[0] == "split_topic" for c in ai.calls) == 2


def test_seed_promotes_existing_user_trail_to_catalog(session_factory):
    with session_factory() as db:
        db.add(Trail(title="Excel básico", topic_norm="excel basico", status="ready"))
        db.commit()
    ai = FakeAI()
    seed([("livre", "Excel básico")], ai, FakeVideos(), session_factory, pause_s=0)
    with session_factory() as db:
        (trail,) = db.scalars(select(Trail)).all()
    assert trail.is_catalog is True
    assert ai.calls == []
