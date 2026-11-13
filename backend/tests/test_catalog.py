from app.trails.catalog import match, normalize


def test_normalize_strips_accents_case_and_spaces():
    assert normalize("  Cálculo   I ") == "calculo i"


def test_match_finds_by_word():
    assert match("calculo", {1: "Cálculo I — Limites", 2: "Física"}) == [1]


def test_match_accepts_word_being_typed():
    assert match("calc", {1: "Cálculo I — Limites", 2: "Física"}) == [1]


def test_match_orders_by_overlap_and_ignores_zero():
    titles = {1: "Leis de Newton", 2: "Leis de Kepler e Newton na órbita", 3: "Redação"}
    assert match("leis newton orbita", titles) == [2, 1]


def test_match_blank_query_matches_nothing():
    assert match("   ", {1: "Física"}) == []
