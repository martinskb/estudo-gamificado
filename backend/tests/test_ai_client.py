import pytest

from app.ai.client import AIError, parse_parts, parse_quiz


def test_parse_parts_accepts_4_to_6_and_trims():
    assert parse_parts('{"parts": [" A ", "B", "C", "D"]}') == ["A", "B", "C", "D"]
    assert len(parse_parts('{"parts": ["1","2","3","4","5","6","7"]}')) == 6


@pytest.mark.parametrize("text", ["não é json", '{"parts": ["A", "B"]}', '{"parts": "A"}', "{}", '{"parts": ["A","B","C",""]}'])
def test_parse_parts_rejects_bad_output(text):
    with pytest.raises(AIError):
        parse_parts(text)


GOOD = '{"questions": [{"question": "2+2?", "options": ["1","2","3","4"], "correct_index": 3, "explanation": "soma"}]}'


def test_parse_quiz_good():
    (item,) = parse_quiz(GOOD)
    assert item.question == "2+2?" and item.options == ["1", "2", "3", "4"]
    assert item.correct_index == 3 and item.explanation == "soma"


@pytest.mark.parametrize(
    "text",
    [
        "{",
        '{"questions": []}',
        GOOD.replace('"correct_index": 3', '"correct_index": 4'),
        GOOD.replace('["1","2","3","4"]', '["1","2","3"]'),
        GOOD.replace('"2+2?"', '""'),
    ],
)
def test_parse_quiz_rejects_bad_output(text):
    with pytest.raises(AIError):
        parse_quiz(text)
