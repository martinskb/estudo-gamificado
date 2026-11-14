"""O plano grátis do Gemini dá poucas requisições por dia POR MODELO: ao esgotar um,
o cliente passa para o próximo da lista."""
import warnings

import pytest

from app.ai.client import AIError, GeminiClient

warnings.filterwarnings("ignore", category=SyntaxWarning)

PARTS = '{"is_study_topic": true, "parts": ["A", "B", "C", "D"]}'


class FakeModels:
    def __init__(self, behaviour: dict):
        self.behaviour = behaviour  # modelo → texto de resposta ou exceção
        self.calls: list[str] = []

    def generate_content(self, *, model, contents, config):
        self.calls.append(model)
        outcome = self.behaviour[model]
        if isinstance(outcome, Exception):
            raise outcome
        return type("Response", (), {"text": outcome})()


def make(behaviour: dict, models: str) -> tuple[GeminiClient, FakeModels]:
    fake = FakeModels(behaviour)
    client = GeminiClient("KEY", models, client=type("Client", (), {"models": fake})())
    return client, fake


def test_falls_back_to_next_model_when_quota_is_exhausted():
    ai, fake = make({"a": Exception("429 RESOURCE_EXHAUSTED. quota"), "b": PARTS}, "a, b")
    assert ai.split_topic("Tema", "livre") == ["A", "B", "C", "D"]
    assert fake.calls == ["a", "b"]


def test_exhausted_model_is_skipped_on_following_calls():
    ai, fake = make({"a": Exception("429 RESOURCE_EXHAUSTED"), "b": PARTS}, "a,b")
    ai.split_topic("Tema", "livre")
    ai.split_topic("Tema", "livre")
    assert fake.calls == ["a", "b", "b"]


@pytest.mark.parametrize(
    "message",
    ["503 UNAVAILABLE. high demand", "404 NOT_FOUND. models/a is not found", "504 DEADLINE_EXCEEDED. Deadline expired"],
)
def test_unavailable_or_unknown_model_also_falls_back(message):
    ai, fake = make({"a": Exception(message), "b": PARTS}, "a,b")
    assert ai.split_topic("Tema", "livre") == ["A", "B", "C", "D"]


def test_all_models_exhausted_raises_ai_error():
    ai, _ = make({"a": Exception("429 RESOURCE_EXHAUSTED"), "b": Exception("429 RESOURCE_EXHAUSTED")}, "a,b")
    with pytest.raises(AIError):
        ai.split_topic("Tema", "livre")


def test_other_errors_do_not_burn_through_the_list():
    ai, fake = make({"a": Exception("400 INVALID_ARGUMENT"), "b": PARTS}, "a,b")
    with pytest.raises(AIError):
        ai.split_topic("Tema", "livre")
    assert fake.calls == ["a"]
