from app.topics.levels import level_for


def test_starts_unlit_before_the_first_hour():
    lv = level_for(0)
    assert (lv.name, lv.next_name, lv.progress, lv.seconds_to_next) == ("Acendendo", "Faísca", 0.0, 3600)


def test_levels_by_hours():
    assert level_for(3600).name == "Faísca"
    assert level_for(5 * 3600).name == "Chama"
    assert level_for(15 * 3600).name == "Lanterna"
    assert level_for(40 * 3600).name == "Farol"


def test_progress_towards_next_level():
    lv = level_for(10 * 3600)  # entre Chama (5 h) e Lanterna (15 h)
    assert lv.name == "Chama" and lv.next_name == "Lanterna"
    assert lv.progress == 0.5
    assert lv.seconds_to_next == 5 * 3600


def test_top_level_is_complete():
    lv = level_for(100 * 3600)
    assert (lv.name, lv.next_name, lv.progress, lv.seconds_to_next) == ("Farol", None, 1.0, 0)
